#!/usr/bin/env node

/**
 * Document Validation Script
 * Validates all .md files for: frontmatter, naming, broken links
 *
 * Usage:
 *   node scripts/validate-docs.js [--strict] [--fix]
 *
 * Exit codes:
 *   0 = all OK
 *   1 = warnings (links may be broken)
 *   2 = errors (structure issues)
 */

const fs = require("fs");
const path = require("path");

// Configuration
const DOCS_ROOT = "./docs";
const STRICT_MODE = process.argv.includes("--strict");
const FIX_MODE = process.argv.includes("--fix");

class DocumentValidator {
  constructor() {
    this.files = [];
    this.errors = [];
    this.warnings = [];
    this.fixed = [];
  }

  /**
   * Scan all markdown files
   */
  scanFiles() {
    const scan = (dir) => {
      const files = fs.readdirSync(dir, { withFileTypes: true });
      files.forEach((file) => {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory() && !file.name.startsWith(".")) {
          scan(fullPath);
        } else if (file.name.endsWith(".md")) {
          this.files.push(fullPath);
        }
      });
    };

    scan(DOCS_ROOT);
    return this.files.length;
  }

  /**
   * Validate single file
   */
  validateFile(filePath) {
    const content = fs.readFileSync(filePath, "utf-8");
    const relativePath = path.relative(process.cwd(), filePath);

    // 1. Check frontmatter
    this.validateFrontmatter(filePath, content, relativePath);

    // 2. Check file naming
    this.validateNaming(filePath, relativePath);

    // 3. Check for broken links
    this.validateLinks(filePath, content, relativePath);

    // 4. Check for title
    this.validateTitle(content, relativePath);
  }

  /**
   * Validate YAML frontmatter
   */
  validateFrontmatter(filePath, content, relativePath) {
    if (!content.startsWith("---")) {
      this.warnings.push({
        file: relativePath,
        type: "missing_frontmatter",
        message: "No YAML frontmatter found",
      });

      if (FIX_MODE) {
        const frontmatter = this.generateFrontmatter(filePath, content);
        const newContent = `---\n${frontmatter}\n---\n\n${content}`;
        fs.writeFileSync(filePath, newContent);
        this.fixed.push(relativePath);
      }
      return;
    }

    const endIndex = content.indexOf("---", 3);
    if (endIndex === -1) {
      this.errors.push({
        file: relativePath,
        type: "invalid_frontmatter",
        message: "Frontmatter not properly closed",
      });
      return;
    }

    const frontmatterStr = content.substring(3, endIndex);
    const fields = {};

    frontmatterStr.split("\n").forEach((line) => {
      const match = line.match(/^(\w+):\s*(.+)$/);
      if (match) {
        fields[match[1]] = match[2];
      }
    });

    // Check required fields
    const required = ["name", "description", "type"];
    required.forEach((field) => {
      if (!fields[field]) {
        this.warnings.push({
          file: relativePath,
          type: "missing_field",
          message: `Missing frontmatter field: ${field}`,
        });
      }
    });

    // Validate type enum
    const validTypes = ["project", "user", "feedback", "reference"];
    if (fields.type && !validTypes.includes(fields.type)) {
      this.errors.push({
        file: relativePath,
        type: "invalid_type",
        message: `Invalid type: ${fields.type}. Must be one of: ${validTypes.join(", ")}`,
      });
    }
  }

  /**
   * Validate filename convention
   */
  validateNaming(filePath, relativePath) {
    const filename = path.basename(filePath);

    // Rules
    const rules = [
      {
        pattern: /^\d{4}-\d{2}-\d{2}_[a-z0-9\-_.]+\.md$/,
        context: "report",
      },
      { pattern: /^runbook_[a-z0-9\-_]+\.md$/, context: "runbook" },
      { pattern: /^[a-z0-9\-_.]+\.md$/, context: "general" },
    ];

    const matches = rules.filter((r) => r.pattern.test(filename));
    if (matches.length === 0) {
      this.warnings.push({
        file: relativePath,
        type: "naming_convention",
        message: `Filename doesn't follow convention: ${filename}. Use TITLE.md, YYYY-MM-DD_title.md, or runbook_title.md`,
      });
    }
  }

  /**
   * Validate internal links
   */
  validateLinks(filePath, content, relativePath) {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const dirName = path.dirname(filePath);
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
      const href = match[2];

      // Skip external links and anchors
      if (href.startsWith("http") || href.startsWith("#")) continue;

      const linkedPath = path.resolve(dirName, href);

      if (!fs.existsSync(linkedPath)) {
        this.warnings.push({
          file: relativePath,
          type: "broken_link",
          message: `Link not found: ${href} (resolved to ${linkedPath})`,
          link: href,
        });
      }
    }
  }

  /**
   * Validate main title (# heading)
   */
  validateTitle(content, relativePath) {
    const titleMatch = content.match(/^#\s+(.+)$/m);
    if (!titleMatch) {
      this.warnings.push({
        file: relativePath,
        type: "no_title",
        message: "No main title (# heading) found",
      });
    }
  }

  /**
   * Generate frontmatter
   */
  generateFrontmatter(filePath, content) {
    const filename = path.basename(filePath);
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : filename.replace(".md", "");

    // Determine type based on path
    let type = "project";
    if (filePath.includes("00-Governo")) type = "reference";
    if (filePath.includes("20-Tecnologia")) type = "reference";

    const lines = [
      `name: ${title}`,
      `description: Auto-generated frontmatter`,
      `type: ${type}`,
      `status: active`,
      `dateCreated: ${new Date().toISOString().split("T")[0]}`,
      `dateModified: ${new Date().toISOString().split("T")[0]}`,
    ];

    return lines.join("\n");
  }

  /**
   * Generate report
   */
  report() {
    console.log("\n═══════════════════════════════════════════════════");
    console.log("📋 DOCUMENT VALIDATION REPORT");
    console.log("═══════════════════════════════════════════════════\n");

    console.log(`📁 Files Scanned: ${this.files.length}`);
    console.log(`✅ Errors: ${this.errors.length}`);
    console.log(`⚠️  Warnings: ${this.warnings.length}`);
    console.log(`🔧 Fixed: ${this.fixed.length}\n`);

    if (this.errors.length > 0) {
      console.log("❌ ERRORS:");
      this.errors.forEach((e) => {
        console.log(`  ${e.file}: ${e.message} (${e.type})`);
      });
      console.log();
    }

    if (this.warnings.length > 0) {
      console.log("⚠️  WARNINGS:");
      this.warnings.slice(0, 10).forEach((w) => {
        console.log(`  ${w.file}: ${w.message} (${w.type})`);
      });
      if (this.warnings.length > 10) {
        console.log(`  ... and ${this.warnings.length - 10} more warnings`);
      }
      console.log();
    }

    if (FIX_MODE && this.fixed.length > 0) {
      console.log("🔧 FIXED:");
      this.fixed.forEach((f) => {
        console.log(`  ${f}`);
      });
      console.log();
    }

    // Exit code logic
    if (this.errors.length > 0) {
      process.exit(2);
    } else if (this.warnings.length > 0 && STRICT_MODE) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

// Main
const validator = new DocumentValidator();
const count = validator.scanFiles();

console.log(`🔍 Scanning ${count} documentation files...\n`);

validator.files.forEach((file) => {
  validator.validateFile(file);
});

validator.report();
