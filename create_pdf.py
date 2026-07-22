"""
Generate PDF Presentation for Xtelify Security Portal
Run: pip install reportlab && python create_pdf.py
"""

from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT

# Page size
PAGE_WIDTH, PAGE_HEIGHT = landscape(A4)

# Colors
DARK_BLUE = colors.Color(15/255, 23/255, 42/255)
LIGHT_BLUE = colors.Color(14/255, 165/255, 233/255)
PURPLE = colors.Color(139/255, 92/255, 246/255)
LIGHT_GRAY = colors.Color(226/255, 232/255, 240/255)
DARK_GRAY = colors.Color(51/255, 65/255, 85/255)
GREEN = colors.Color(16/255, 185/255, 129/255)

# Create document
doc = SimpleDocTemplate(
    "Xtelify_Security_Portal_Presentation.pdf",
    pagesize=landscape(A4),
    rightMargin=40,
    leftMargin=40,
    topMargin=40,
    bottomMargin=40
)

# Styles
styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    'TitleStyle',
    parent=styles['Heading1'],
    fontSize=42,
    textColor=colors.white,
    alignment=TA_CENTER,
    spaceAfter=20,
    fontName='Helvetica-Bold'
)

subtitle_style = ParagraphStyle(
    'SubtitleStyle',
    parent=styles['Normal'],
    fontSize=24,
    textColor=LIGHT_BLUE,
    alignment=TA_CENTER,
    spaceAfter=10
)

heading_style = ParagraphStyle(
    'HeadingStyle',
    parent=styles['Heading1'],
    fontSize=28,
    textColor=LIGHT_BLUE,
    alignment=TA_LEFT,
    spaceAfter=20,
    fontName='Helvetica-Bold'
)

subheading_style = ParagraphStyle(
    'SubheadingStyle',
    parent=styles['Heading2'],
    fontSize=18,
    textColor=PURPLE,
    alignment=TA_LEFT,
    spaceAfter=10,
    fontName='Helvetica-Bold'
)

body_style = ParagraphStyle(
    'BodyStyle',
    parent=styles['Normal'],
    fontSize=14,
    textColor=LIGHT_GRAY,
    alignment=TA_LEFT,
    spaceAfter=8,
    leading=20
)

code_style = ParagraphStyle(
    'CodeStyle',
    parent=styles['Normal'],
    fontSize=11,
    textColor=colors.Color(165/255, 243/255, 252/255),
    alignment=TA_LEFT,
    fontName='Courier',
    backColor=DARK_GRAY,
    spaceAfter=5,
    leftIndent=20,
    leading=16
)

# Build content
story = []

def add_page_break():
    story.append(PageBreak())

def add_title_slide(title, subtitle):
    story.append(Spacer(1, 2*inch))
    story.append(Paragraph(title, title_style))
    story.append(Spacer(1, 0.3*inch))
    story.append(Paragraph(subtitle, subtitle_style))
    add_page_break()

def add_content_slide(title, bullets, code=None):
    story.append(Paragraph(title, heading_style))
    story.append(Spacer(1, 0.2*inch))
    for bullet in bullets:
        if bullet:
            story.append(Paragraph(f"* {bullet}", body_style))
    if code:
        story.append(Spacer(1, 0.2*inch))
        for line in code.split('\n'):
            story.append(Paragraph(line, code_style))
    add_page_break()

def add_two_column_slide(title, left_title, left_items, right_title, right_items):
    story.append(Paragraph(title, heading_style))
    story.append(Spacer(1, 0.2*inch))

    # Create two-column table
    left_content = f"<b><font color='#{PURPLE.hexval()[2:]}'>{left_title}</font></b><br/><br/>"
    for item in left_items:
        if item:
            left_content += f"* {item}<br/>"

    right_content = f"<b><font color='#{PURPLE.hexval()[2:]}'>{right_title}</font></b><br/><br/>"
    for item in right_items:
        if item:
            right_content += f"* {item}<br/>"

    data = [[
        Paragraph(left_content, body_style),
        Paragraph(right_content, body_style)
    ]]

    table = Table(data, colWidths=[4*inch, 4*inch])
    table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('BOX', (0, 0), (0, 0), 1, DARK_GRAY),
        ('BOX', (1, 0), (1, 0), 1, DARK_GRAY),
        ('BACKGROUND', (0, 0), (-1, -1), DARK_GRAY),
    ]))

    story.append(table)
    add_page_break()


# ============ CREATE SLIDES ============

# Slide 1: Title
add_title_slide(
    "Xtelify Security Portal",
    "Enterprise Vulnerability Management Dashboard"
)

# Slide 2: Overview
add_content_slide(
    "Project Overview",
    [
        "Web-based vulnerability management platform for enterprise security teams",
        "Upload and process vulnerability scan reports (Excel, CSV, JSON)",
        "Smart worksheet detection for multi-sheet Excel files",
        "Real-time vulnerability tracking and status management",
        "Team performance leaderboard with MTTR metrics",
        "Export capabilities (Excel, PDF)",
        "Role-based access control (Admin / Viewer)"
    ]
)

# Slide 3: Tech Stack
add_two_column_slide(
    "Tech Stack",
    "Frontend",
    [
        "React 19 - UI Framework",
        "TypeScript - Type Safety",
        "Vite 8 - Build Tool",
        "TailwindCSS 4 - Styling",
        "Recharts - Data Visualization",
        "Lucide React - Icons",
        "XLSX (SheetJS) - Excel Export",
        "jsPDF - PDF Generation"
    ],
    "Backend",
    [
        "Python 3.x - Language",
        "FastAPI - REST API Framework",
        "Pandas - Data Processing",
        "openpyxl - Excel Inspection",
        "httpx - Async HTTP Client",
        "LangSmith - AI Observability",
        "JSON File - Database Storage",
        "Docker + Nginx - Deployment"
    ]
)

# Slide 4: Architecture
add_content_slide(
    "System Architecture",
    [
        "BROWSER (React + TypeScript)",
        "    Dashboard | Charts (Recharts) | Upload Modal | Export (XLSX/PDF)",
        "",
        "                    |  REST API (HTTP)  |",
        "",
        "BACKEND (FastAPI + Python)",
        "    /api/upload-report | /api/db | /api/leaderboard",
        "    Smart Worksheet Detection (openpyxl) | Data Processing (Pandas)",
        "    Storage: xtelify_db.json"
    ]
)

# Slide 5: API Endpoints
add_content_slide(
    "API Endpoints",
    [
        "GET  /api/db                    - Fetch all vulnerability records",
        "POST /api/db                    - Add new vulnerability items",
        "DELETE /api/db                  - Delete dataset by UploadBatch",
        "POST /api/upload-report         - Upload & process Excel/CSV/JSON",
        "POST /api/upload-report-with-sheet - Upload with manual sheet selection",
        "GET  /api/leaderboard           - Get team performance rankings",
        "GET  /{path}                    - Serve frontend static files"
    ]
)

# Slide 6: Upload Flow
add_content_slide(
    "Data Flow: Upload Process",
    [
        "1. User selects Excel file in browser",
        "2. Frontend sends FormData to /api/upload-report",
        "3. Backend scans all worksheets using openpyxl (read-only mode)",
        "4. Smart detection scores each sheet and selects the best one",
        "5. Header row detected by scanning first 15 rows",
        "6. Pandas reads selected sheet from header row",
        "7. Column mapping applied (ID -> IssueID, CVSSSeverity -> Severity)",
        "8. Records normalized and saved to xtelify_db.json",
        "9. Frontend reloads to display new data"
    ]
)

# Slide 7: Smart Worksheet Detection
add_two_column_slide(
    "Smart Worksheet Detection",
    "Positive Scoring",
    [
        "+3 pts: ID, Name, Severity, FindingStatus",
        "+2 pts: Score, CVSSSeverity, WizURL",
        "+1 pt: Other expected columns",
        "+5 pts: More than 100 data rows",
        "+3 pts: More than 50 data rows"
    ],
    "Negative Scoring",
    [
        "-5 pts: 'Grand Total' in sheet name",
        "-5 pts: 'Count of' in sheet name",
        "-5 pts: 'Pivot' in sheet name",
        "-3 pts: Fewer than 20 rows",
        "",
        "Auto-selects highest scoring sheet!"
    ]
)

# Slide 8: Column Mapping
add_content_slide(
    "Column Auto-Mapping",
    [
        "Supports multiple column naming conventions from different scanners:"
    ],
    "ID / IssueID / VulnID / CVE           ->  IssueID\nCVSSSeverity / VendorSeverity / Risk  ->  Severity\nFirstDetected / DetectedDate           ->  DiscoveredDate\nWizURL / Link / Reference              ->  ReferenceLinks\nRemediation / Resolution / Fix         ->  RecommendedAction"
)

# Slide 9: Vulnerability Grouping
add_content_slide(
    "Vulnerability Grouping",
    [
        "Frontend groups vulnerabilities by CVE/ID",
        "Multiple assets affected by same vulnerability shown together",
        "Expandable rows to see affected assets",
        "Highest severity from group displayed",
        "Status aggregated (Open if any asset is open)"
    ],
    "Example:\nCVE-2024-12345  |  Critical  |  5 Assets Affected\nCVE-2024-67890  |  High      |  12 Assets Affected"
)

# Slide 10: Leaderboard
add_two_column_slide(
    "Leaderboard & Gamification",
    "Points Calculation",
    [
        "Critical fix: 100 base pts",
        "High fix: 50 base pts",
        "Medium/Low fix: 25 base pts",
        "",
        "Speed Multiplier:",
        "multiplier = SLA_hours / actual_hours",
        "Faster fixes = More points!"
    ],
    "Tier System",
    [
        "Elite Guardian: > 1800 pts",
        "SecOps Specialist: > 1400 pts",
        "Patch Master: > 1000 pts",
        "Green Horn: < 1000 pts",
        "",
        "Encourages fast remediation!"
    ]
)

# Slide 11: File Structure
add_content_slide(
    "Project File Structure",
    [],
    "xtelify-security-portal-main/\n  app.py              - FastAPI backend\n  xtelify_db.json     - JSON database\n  package.json        - Dependencies\n  Dockerfile          - Docker build\n  src/\n    App.tsx           - Main React app\n    main.tsx          - Entry point\n  dist/               - Production build"
)

# Slide 12: Database Schema
add_content_slide(
    "Database Schema",
    [
        "Each vulnerability record in xtelify_db.json contains:"
    ],
    '{\n  "IssueID": "CVE-2024-12345",\n  "Severity": "Critical",\n  "Status": "Open",\n  "AssignedTo": "john.doe@company.com",\n  "DueDate": "2026-07-22",\n  "RecommendedAction": "Upgrade to v3.1.5"\n}'
)

# Slide 13: Deployment
add_two_column_slide(
    "Deployment Options",
    "Development Mode",
    [
        "Terminal 1 (Backend):",
        "uvicorn app:app --reload",
        "  --host 0.0.0.0 --port 8000",
        "",
        "Terminal 2 (Frontend):",
        "npm run dev"
    ],
    "Production Mode",
    [
        "Option 1: Docker",
        "docker build -t xtelify-portal .",
        "docker run -p 80:80 xtelify-portal",
        "",
        "Option 2: Combined",
        "npm run build && uvicorn app:app"
    ]
)

# Slide 14: Summary
add_content_slide(
    "Summary",
    [
        "Unified View: All vulnerabilities in one dashboard",
        "Smart Processing: Auto-detects data format and columns",
        "Actionable Insights: Charts, stats, and remediation priorities",
        "Team Accountability: Leaderboard gamifies security work",
        "Flexible Export: Excel and PDF reports",
        "Offline-First: Works without internet (JSON file storage)",
        "",
        "Tech Stack: React + TypeScript + FastAPI + Pandas"
    ]
)

# Slide 15: Thank You
story.append(Spacer(1, 2*inch))
story.append(Paragraph("Thank You!", title_style))
story.append(Spacer(1, 0.3*inch))
story.append(Paragraph("Questions?", subtitle_style))

# Build PDF
doc.build(story)
print("PDF saved: Xtelify_Security_Portal_Presentation.pdf")
