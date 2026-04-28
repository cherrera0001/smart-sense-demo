#!/usr/bin/env node

/**
 * MCP File Indexer — Document classification & validation
 *
 * Purpose: Index documentation, detect duplicates, suggest categories
 * Usage: Called by document-curator skill + hooks
 */

const fs = require("fs");
const path = require("path");

// Configuration
const DOCS_ROOT = process.env.DOCS_ROOT || "./docs";
const CATEGORIES = ["00-Gobierno", "10-Producto", "20-Tecnologia", "30-Operaciones", "40-Clientes", "90-Archivo"];
const NAMING_CONVENTION = {
  active: /^[a-z0-9\-_\.]+\.md$/,
  report: /^\d{4}-\d{2}-\d{2}_[a-z0-9\-_]+\.md$/,
  runbook: /^runbook_[a-z0-9\-_]+\.md$/,
};

/**
 * Index all documentation
 */
function indexDocs() {
  const index = {
    timestamp: new Date().toISOString(),
    files: [],
    categories: {},
    errors: [],
  };

  CATEGORIES.forEach((cat) => {
    index.categories[cat] = { count: 0, files: [] };
  });

  // Scan all .md files
  const allFiles = scanMarkdownFiles(DOCS_ROOT);

  allFiles.forEach((filePath) => {
    const relPath = path.relative(process.cwd(), filePath);
    const category = extractCategory(filePath);
    const fileInfo = analyzeFile(filePath);

    index.files.push({
      path: relPath,
      name: path.basename(filePath),
      category,
      ...fileInfo,
    });

    if (category && index.categories[category]) {
      index.categories[category].count++;
      index.categories[category].files.push(relPath);
    }
  });

  return index;
}

/**
 * Scan for all .md files recursively
 */
function scanMarkdownFiles(dir) {
  let results = [];
  const files = fs.readdirSync(dir, { withFileTypes: true });

  files.forEach((file) => {
    const fullPath = path.join(dir, file.name);

    if (file.isDirectory()) {
      results = results.concat(scanMarkdownFiles(fullPath));
    } else if (file.name.endsWith(".md")) {
      results.push(fullPath);
    }
  });

  return results;
}

/**
 * Extract category from file path
 */
function extractCategory(filePath) {
  for (const cat of CATEGORIES) {
    if (filePath.includes(cat)) {
      return cat;
    }
  }
  return null;
}

/**
 * Analyze single file for frontmatter, links, etc.
 */
function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  // Extract frontmatter
  let frontmatter = {};
  let frontmatterEnd = -1;

  if (lines[0] === "---") {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i] === "---") {
        frontmatterEnd = i;
        break;
      }
      const match = lines[i].match(/^(\w+):\s*(.+)$/);
      if (match) {
        frontmatter[match[1]] = match[2];
      }
    }
  }

  // Extract title (first # heading)
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1] : null;

  // Find all markdown links
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const links = [];
  let match;
  while ((match = linkRegex.exec(content)) !== null) {
    links.push({ text: match[1], href: match[2] });
  }

  // Calculate word count
  const bodyStart = frontmatterEnd >= 0 ? frontmatterEnd + 1 : 0;
  const body = lines.slice(bodyStart).join("\n");
  const wordCount = body.split(/\s+/).length;

  // Detect issues
  const issues = [];
  if (!frontmatter.name) issues.push("missing frontmatter: name");
  if (!frontmatter.description) issues.push("missing frontmatter: description");
  if (!frontmatter.type) issues.push("missing frontmatter: type");
  if (!title) issues.push("no main title (#)");

  return {
    frontmatter,
    title,
    links,
    wordCount,
    hasFrontmatter: frontmatterEnd >= 0,
    issues,
  };
}

/**
 * Suggest category based on filename + content
 */
function suggestCategory(filePath, fileContent) {
  const name = path.basename(filePath).toLowerCase();
  let confidence = 0.5;

  // Pattern matching
  const patterns = {
    "00-Gobierno": [/definition.*done|norma|glosario/i, /^DEFINITION_OF_DONE/],
    "10-Producto": [/claude|product|overview|roadmap/i, /^CLAUDE\.md/],
    "20-Tecnologia": [/deploy|config|troubleshoot|tech|stack|docker|node/i, /README_DEPLOYMENT|TROUBLESHOOTING|CLOUDFLARE/],
    "30-Operaciones": [/report|audit|check|validation|qa|ux/i, /REPORT|AUDIT|CHECKLIST|VALIDATION/],
    "40-Clientes": [/handoff|defense|cliente|presentation/i, /HANDOFF|GUION_DEFENSA/],
    "90-Archivo": [/fase|cierre|archive|old|obsolete/i, /FASE[0-9]|CIERRE/],
  };

  let bestMatch = null;
  let bestScore = 0;

  for (const [category, patternList] of Object.entries(patterns)) {
    for (const pattern of patternList) {
      if (pattern.test(name)) {
        const score = pattern.constructor.name === "RegExp" ? 0.9 : 0.7;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = category;
        }
      }
    }
  }

  return {
    category: bestMatch || "10-Producto", // default
    confidence: bestScore,
  };
}

/**
 * Find duplicate files (simple cosine similarity)
 */
function findDuplicates(files, threshold = 0.7) {
  const duplicates = [];

  for (let i = 0; i < files.length; i++) {
    for (let j = i + 1; j < files.length; j++) {
      const sim = calculateSimilarity(files[i], files[j]);
      if (sim > threshold) {
        duplicates.push({
          file1: files[i].path,
          file2: files[j].path,
          similarity: sim,
        });
      }
    }
  }

  return duplicates;
}

/**
 * Simple similarity (word overlap)
 */
function calculateSimilarity(fileA, fileB) {
  const wordsA = new Set(fileA.title?.toLowerCase().split(/\s+/) || []);
  const wordsB = new Set(fileB.title?.toLowerCase().split(/\s+/) || []);

  const intersection = new Set([...wordsA].filter((x) => wordsB.has(x)));
  const union = new Set([...wordsA, ...wordsB]);

  return intersection.size / union.size;
}

/**
 * Validate all links in documentation
 */
function validateLinks(filePath, fileInfo) {
  const docDir = path.dirname(filePath);
  const broken = [];

  fileInfo.links.forEach((link) => {
    // Only check relative links
    if (link.href.startsWith("http")) return;
    if (link.href.startsWith("#")) return; // anchors

    const linkedPath = path.resolve(docDir, link.href);

    if (!fs.existsSync(linkedPath)) {
      broken.push({
        link: link.href,
        text: link.text,
        resolved: linkedPath,
      });
    }
  });

  return broken;
}

/**
 * Main CLI
 */
function main() {
  const command = process.argv[2] || "index";

  switch (command) {
    case "index":
      console.log(JSON.stringify(indexDocs(), null, 2));
      break;

    case "validate-links": {
      const filePath = process.argv[3];
      if (!filePath) {
        console.error("Usage: mcp-file-indexer.js validate-links <filePath>");
        process.exit(1);
      }
      const fileInfo = analyzeFile(filePath);
      const broken = validateLinks(filePath, fileInfo);
      console.log(JSON.stringify({ file: filePath, brokenLinks: broken }, null, 2));
      break;
    }

    case "suggest-category": {
      const filePath = process.argv[3];
      if (!filePath) {
        console.error("Usage: mcp-file-indexer.js suggest-category <filePath>");
        process.exit(1);
      }
      const content = fs.readFileSync(filePath, "utf-8");
      const suggestion = suggestCategory(filePath, content);
      console.log(JSON.stringify(suggestion, null, 2));
      break;
    }

    case "find-duplicates": {
      const index = indexDocs();
      const duplicates = findDuplicates(index.files);
      console.log(JSON.stringify({ duplicates }, null, 2));
      break;
    }

    case "analyze": {
      const filePath = process.argv[3];
      if (!filePath) {
        console.error("Usage: mcp-file-indexer.js analyze <filePath>");
        process.exit(1);
      }
      const fileInfo = analyzeFile(filePath);
      const suggestion = suggestCategory(filePath, fs.readFileSync(filePath, "utf-8"));
      const brokenLinks = validateLinks(filePath, fileInfo);

      console.log(
        JSON.stringify(
          {
            file: filePath,
            analysis: fileInfo,
            suggestedCategory: suggestion,
            brokenLinks,
          },
          null,
          2
        )
      );
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

main();
