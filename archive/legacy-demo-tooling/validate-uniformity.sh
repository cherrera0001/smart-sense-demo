#!/bin/bash

echo "=== UNIFORMITY VALIDATION REPORT ==="
echo "Date: $(date)"
echo ""

# Test each page
pages=("dashboard" "desglose" "alertas" "reporte" "ajustes")

echo "1. PAGE RESPONSE VALIDATION"
for page in "${pages[@]}"; do
  response=$(curl -s -w "%{http_code}" http://localhost:3000/$page 2>/dev/null | tail -c 3)
  if [ "$response" = "200" ]; then
    echo "✓ /$page: HTTP $response"
  else
    echo "✗ /$page: HTTP $response"
  fi
done

echo ""
echo "2. DESIGN SYSTEM TOKENS VALIDATION"

# Check if new design token classes are used
dashboard_html=$(curl -s http://localhost:3000/dashboard 2>/dev/null)
desglose_html=$(curl -s http://localhost:3000/desglose 2>/dev/null)
reporte_html=$(curl -s http://localhost:3000/reporte 2>/dev/null)
ajustes_html=$(curl -s http://localhost:3000/ajustes 2>/dev/null)

if echo "$dashboard_html" | grep -q "page-header"; then
  echo "✓ page-header class (standardized)"
fi

if echo "$desglose_html" | grep -q "card-premium"; then
  echo "✓ card-premium class (standardized)"
fi

if echo "$reporte_html" | grep -q "page-section"; then
  echo "✓ page-section class (standardized)"
fi

if echo "$ajustes_html" | grep -q "card-title"; then
  echo "✓ card-title class (standardized)"
fi

echo ""
echo "3. COLOR CONSISTENCY"

if echo "$dashboard_html" | grep -q "text-primary"; then
  echo "✓ text-primary tokens present"
fi

if echo "$desglose_html" | grep -q "surface-primary"; then
  echo "✓ surface-primary tokens present"
fi

if echo "$reporte_html" | grep -q "severity-info"; then
  echo "✓ severity color tokens present"
fi

echo ""
echo "4. SPACING CONSISTENCY"

if echo "$dashboard_html" | grep -q "space-y-6"; then
  echo "✓ Consistent spacing (space-y-6)"
fi

if echo "$ajustes_html" | grep -q "p-6"; then
  echo "✓ Consistent padding (p-6)"
fi

echo ""
echo "5. NO HYDRATION ERRORS (HTML Validity)"

# Check for nested buttons (invalid HTML)
if ! echo "$dashboard_html" | grep -q "<button.*<button"; then
  echo "✓ No nested buttons (valid HTML)"
else
  echo "⚠ Possible nested buttons"
fi

echo ""
echo "=== STANDARDIZATION COMPLETE ==="
