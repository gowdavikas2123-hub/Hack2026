# Workshop Parts Desk – Frontend Application

Modern React + TypeScript + Tailwind CSS dashboard and AI Operations monitoring cockpit.

## Features

1. **Dashboard KPI Summary:** High-level metrics for processed requests, dispatches, human reviews, available stock, and budget utilization.
2. **Batch Control Panel:** Single-click batch start, pause, resume, progress bar, and scenario reset.
3. **Customer Requests Table:** 6 customer requests with original prose, extracted specifications, clarification status, and outcome badges.
4. **12-Part Catalogue:** Prose descriptions, RECENT vs AGED badges, current stock, and discrepancy alerts.
5. **AI Decision Monitor:** Transparent 8-stage timeline trace showing specification extraction, clarification, verification, and selection reasoning.
6. **Live Tool Feed:** Real-time log of tool calls (Inspection, Clarification, Verification, Dispatch) with duration and cost.
7. **Audit & Evidence Dossier:** Expandable modal displaying customer evidence, catalogue notes, and verification logs.
8. **Spending & Token Tracker:** Cumulative token consumption and spending breakdown by category.
9. **Human Review Escalation Center:** Supervisor workflow for reviewing escalated cases, with strict backend revalidation before any manual dispatch.
10. **Interactive AI Copilot Chatbot:** Floating assistant drawer capable of answering queries regarding inventory, aged discrepancies, rules, and active batch state.

## Setup & Running

1. **Install Dependencies:**
   ```powershell
   npm install
   ```

2. **Start Development Server:**
   ```powershell
   npm run dev
   ```

3. **Build for Production:**
   ```powershell
   npm run build
   ```
