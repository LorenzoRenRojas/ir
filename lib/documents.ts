// ─── Full questionnaire data for 99%-complete proposals ───────────────────────

export interface FullProposalQuestionnaire {
  // Opportunity
  contractTitle: string
  agencyName: string
  solicitationNumber: string
  issuingOffice: string
  responseDeadline: string
  estimatedValue: string
  contractType: string
  naicsCode: string
  placeOfPerformance: string
  requirementSummary: string
  keyObjectives: string

  // Technical approach
  overallApproach: string
  phase1: { name: string; timeline: string; deliverables: string; approach: string }
  phase2: { name: string; timeline: string; deliverables: string; approach: string }
  phase3: { name: string; timeline: string; deliverables: string; approach: string }
  toolsTechnologies: string
  qualityApproach: string
  risks: Array<{ description: string; likelihood: string; impact: string; mitigation: string }>

  // Team
  pm: { name: string; title: string; clearance: string; experience: string; quals: string }
  techLead: { name: string; title: string; clearance: string; experience: string; quals: string }
  additionalPersonnel: string
  subName: string
  subRole: string
  subPercent: string
  primePercent: string

  // Past performance (3 contracts)
  pp: Array<{
    title: string; agency: string; contractNumber: string; contractType: string
    value: string; startDate: string; endDate: string
    description: string; relevance: string; outcomes: string
    refName: string; refTitle: string; refPhone: string; refEmail: string
  }>

  // Pricing
  baseYear: string
  oy1: string; oy2: string; oy3: string; oy4: string
  totalPrice: string
  amendments: string
}

export function generateFullProposal(company: CompanyData, q: FullProposalQuestionnaire): string {
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const businessTypes = company.businessTypes.join(', ') || 'Small Business'
  const certs = company.certifications.join(', ') || 'None'
  const clearance = company.clearanceLevel ? `\nSecurity Clearance: ${company.clearanceLevel}` : ''

  const ppSection = q.pp.map((p, i) => `
──────────────────────────────────────────────────────────────────────────────
CONTRACT ${i + 1}
──────────────────────────────────────────────────────────────────────────────
Contract Title:          ${p.title}
Contracting Agency:      ${p.agency}
Contract Number:         ${p.contractNumber}
Contract Type:           ${p.contractType}
Total Contract Value:    ${p.value}
Period of Performance:   ${p.startDate} – ${p.endDate}
NAICS Code:              ${q.naicsCode || company.naicsCodes[0] || '[NAICS]'}
Place of Performance:    ${q.placeOfPerformance}
Prime or Sub:            Prime

Description of Work:
  ${p.description}

Relevance to This Requirement:
  ${p.relevance}

Outcomes and Achievements:
${p.outcomes.split('\n').map((l: string) => `  • ${l.trim()}`).filter((l: string) => l.trim() !== '•').join('\n')}
`).join('')

  const ppRefs = q.pp.map((p, i) => `
Reference ${i + 1} — ${p.title}
  Name:    ${p.refName}
  Title:   ${p.refTitle}
  Agency:  ${p.agency}
  Phone:   ${p.refPhone}
  Email:   ${p.refEmail}`).join('\n')

  const riskRows = q.risks.filter(r => r.description).map(r => `
  RISK:        ${r.description}
  LIKELIHOOD:  ${r.likelihood || 'Medium'}
  IMPACT:      ${r.impact || 'Medium'}
  MITIGATION:  ${r.mitigation}`).join('\n')

  const subSection = q.subName
    ? `${company.companyName} will team with ${q.subName} to provide ${q.subRole}. ${q.subName} will perform approximately ${q.subPercent}% of the contract work.`
    : `${company.companyName} will perform 100% of contract work using our own resources.`

  const additionalPersonnel = q.additionalPersonnel
    ? `\n\nAdditional Key Personnel:\n${q.additionalPersonnel}`
    : ''

  const computedTotal = q.totalPrice || (() => {
    const vals = [q.baseYear, q.oy1, q.oy2, q.oy3, q.oy4]
      .map(v => parseFloat(v.replace(/[$,]/g, '')) || 0)
    const t = vals.reduce((a, b) => a + b, 0)
    return t > 0 ? `$${t.toLocaleString()}` : '[TOTAL]'
  })()

  return `================================================================================
                           TECHNICAL AND MANAGEMENT PROPOSAL
================================================================================

CONTRACT TITLE:      ${q.contractTitle}
SOLICITATION NO.:    ${q.solicitationNumber || '[SOLICITATION NUMBER]'}
ISSUING AGENCY:      ${q.agencyName}
ISSUING OFFICE:      ${q.issuingOffice || '[ISSUING OFFICE]'}
SUBMITTED BY:        ${company.companyName}
DATE:                ${today}
RESPONSE DEADLINE:   ${q.responseDeadline || '[RESPONSE DEADLINE]'}

================================================================================
                              OFFEROR INFORMATION
================================================================================

Legal Business Name:   ${company.companyName}
UEI (SAM.gov):         ${company.uei || '[UEI]'}
CAGE Code:             ${company.cageCode || '[CAGE CODE]'}
Business Address:      ${company.address || '[ADDRESS]'}
Website:               ${company.website || '[WEBSITE]'}
Business Type(s):      ${businessTypes}
Primary NAICS Code:    ${q.naicsCode || company.naicsCodes[0] || '[NAICS]'}
Certifications:        ${certs}${clearance}
${company.yearFounded ? `Year Established:      ${company.yearFounded}` : ''}

Point of Contact:
  Name:    ${company.contactName || '[POC NAME]'}
  Email:   ${company.contactEmail || '[EMAIL]'}
  Phone:   ${company.contactPhone || '[PHONE]'}

================================================================================
                            TABLE OF CONTENTS
================================================================================

  VOLUME I  — TECHNICAL APPROACH
    Section 1.0    Executive Summary
    Section 2.0    Understanding of the Requirement
    Section 3.0    Technical Approach and Methodology
    Section 4.0    Quality Assurance and Risk Management

  VOLUME II — MANAGEMENT APPROACH
    Section 5.0    Management Structure and Key Personnel
    Section 6.0    Staffing Plan and Subcontracting
    Section 7.0    Transition Plan

  VOLUME III — PAST PERFORMANCE
    Section 8.0    Relevant Past Performance
    Section 9.0    References

  VOLUME IV — PRICE/COST SUMMARY
    Section 10.0   Price/Cost Cover Sheet

================================================================================
                     VOLUME I — TECHNICAL APPROACH
================================================================================

SECTION 1.0  EXECUTIVE SUMMARY
───────────────────────────────

${company.companyName} is pleased to submit this proposal in response to the
${q.agencyName} solicitation for ${q.contractTitle}${q.solicitationNumber ? ` (${q.solicitationNumber})` : ''}.

We are a ${businessTypes}${company.yearFounded ? `, established in ${company.yearFounded},` : ''} with proven
expertise delivering high-quality solutions to federal government clients.

Key Strengths We Bring to This Requirement:
${q.overallApproach.split('\n').slice(0, 3).map((l: string) => `  • ${l.trim()}`).filter((l: string) => l !== '  •').join('\n')}
  • ${certs !== 'None' ? `Active certifications: ${certs}` : `Registered ${businessTypes} in SAM.gov`}
  • Proven past performance with similar federal requirements${q.pp[0]?.agency ? ` (including ${q.pp[0].agency})` : ''}

───────────────────────────────
SECTION 2.0  UNDERSTANDING OF THE REQUIREMENT
───────────────────────────────

${q.requirementSummary || `${company.companyName} has thoroughly reviewed the solicitation and all attachments. We understand that ${q.agencyName} requires the services described in ${q.contractTitle}.`}

Primary Objectives:
${q.keyObjectives.split('\n').map((l: string, i: number) => `  ${i + 1}. ${l.trim()}`).filter((l: string) => l.trim().match(/^\s*\d+\.\s+\S/)).join('\n') || `  1. [KEY OBJECTIVE 1]\n  2. [KEY OBJECTIVE 2]\n  3. [KEY OBJECTIVE 3]`}

───────────────────────────────
SECTION 3.0  TECHNICAL APPROACH AND METHODOLOGY
───────────────────────────────

3.1  Overall Approach

${q.overallApproach}

3.2  ${q.phase1.name || 'Phase 1 — Mobilization and Planning'}

Timeline: ${q.phase1.timeline || '[TIMELINE]'}

Deliverables:
${q.phase1.deliverables.split('\n').map((l: string) => `  • ${l.trim()}`).filter((l: string) => l !== '  •').join('\n') || '  • [DELIVERABLE]'}

Approach:
${q.phase1.approach}

3.3  ${q.phase2.name || 'Phase 2 — Execution'}

Timeline: ${q.phase2.timeline || '[TIMELINE]'}

Deliverables:
${q.phase2.deliverables.split('\n').map((l: string) => `  • ${l.trim()}`).filter((l: string) => l !== '  •').join('\n') || '  • [DELIVERABLE]'}

Approach:
${q.phase2.approach}

${q.phase3.name ? `3.4  ${q.phase3.name}

Timeline: ${q.phase3.timeline || '[TIMELINE]'}

Deliverables:
${q.phase3.deliverables.split('\n').map((l: string) => `  • ${l.trim()}`).filter((l: string) => l !== '  •').join('\n')}

Approach: ${q.phase3.approach}

` : ''}3.5  Tools, Technologies, and Systems

${q.toolsTechnologies || '[LIST TOOLS AND TECHNOLOGIES]'}

3.6  Place of Performance
  ${q.placeOfPerformance || '[PLACE OF PERFORMANCE]'}

───────────────────────────────
SECTION 4.0  QUALITY ASSURANCE AND RISK MANAGEMENT
───────────────────────────────

4.1  Quality Control Plan

${q.qualityApproach || '[DESCRIBE QUALITY CONTROL APPROACH]'}

4.2  Risk Management
${riskRows || '\n  [RISK REGISTER — DESCRIBE IDENTIFIED RISKS AND MITIGATIONS]'}

================================================================================
                    VOLUME II — MANAGEMENT APPROACH
================================================================================

SECTION 5.0  MANAGEMENT STRUCTURE AND KEY PERSONNEL
───────────────────────────────

Program Manager: ${q.pm.name}
  Title:       ${q.pm.title}
  Clearance:   ${q.pm.clearance || 'N/A'}
  Experience:  ${q.pm.experience} years of relevant experience
  Qualifications: ${q.pm.quals}

Technical Lead: ${q.techLead.name}
  Title:       ${q.techLead.title}
  Clearance:   ${q.techLead.clearance || 'N/A'}
  Experience:  ${q.techLead.experience} years of relevant experience
  Qualifications: ${q.techLead.quals}
${additionalPersonnel}

───────────────────────────────
SECTION 6.0  STAFFING PLAN AND SUBCONTRACTING
───────────────────────────────

${subSection}

Prime contractor share of work: ${q.primePercent || '100'}%

───────────────────────────────
SECTION 7.0  TRANSITION PLAN
───────────────────────────────

${company.companyName} will execute a structured transition to ensure continuity
of operations from contract award through full operational capability.

  Week 1–2:   Kickoff meeting, access provisioning, documentation review
  Week 3–4:   Staff on-boarding, system familiarization, process handoff
  Day 30:     Full operational capability confirmed with ${q.agencyName} COR

================================================================================
                    VOLUME III — PAST PERFORMANCE
================================================================================

SECTION 8.0  RELEVANT PAST PERFORMANCE
───────────────────────────────
${ppSection}

───────────────────────────────
SECTION 9.0  REFERENCES
───────────────────────────────
${ppRefs}

================================================================================
                    VOLUME IV — PRICE / COST SUMMARY
================================================================================

SECTION 10.0  PRICE / COST COVER SHEET
───────────────────────────────

  Offeror:           ${company.companyName}
  Solicitation No.:  ${q.solicitationNumber || '[SOLICITATION NUMBER]'}
  Date:              ${today}

  ┌─────────────────────────────────────────────────────────────────────────┐
  │                      TOTAL PROPOSED PRICE SUMMARY                      │
  ├──────────────────────────────────┬──────────────────────────────────────┤
  │  Base Year                       │  ${(q.baseYear || '[TBD]').padEnd(36)}│
  │  Option Year 1                   │  ${(q.oy1 || '[TBD]').padEnd(36)}│
  │  Option Year 2                   │  ${(q.oy2 || '[TBD]').padEnd(36)}│
  │  Option Year 3                   │  ${(q.oy3 || '[TBD]').padEnd(36)}│
  │  Option Year 4                   │  ${(q.oy4 || '[TBD]').padEnd(36)}│
  ├──────────────────────────────────┼──────────────────────────────────────┤
  │  TOTAL (All Periods)             │  ${computedTotal.padEnd(36)}│
  └──────────────────────────────────┴──────────────────────────────────────┘

  Acknowledgment of Amendments:  ${q.amendments || 'None'}

  Authorized Signature:  ________________________________
  Name:                  ${company.contactName || '[AUTHORIZED REPRESENTATIVE]'}
  Title:                 [TITLE]
  Date:                  ${today}

================================================================================
                        CERTIFICATIONS AND REPRESENTATIONS
================================================================================

${company.companyName} certifies that the information in this proposal is
accurate and complete, that prices were arrived at independently and without
collusion, and that we are registered and active in SAM.gov.

  Business Type:  ${businessTypes}
  UEI:            ${company.uei || '[UEI]'}
  CAGE:           ${company.cageCode || '[CAGE CODE]'}

________________________________________________________________________________
Generated by IR — Government Contract Intelligence | ir-gov.app
================================================================================
`
}

// ─── Basic company data ────────────────────────────────────────────────────────

export interface CompanyData {
  companyName: string
  uei?: string
  cageCode?: string
  website?: string
  yearFounded?: number
  businessTypes: string[]
  naicsCodes: string[]
  certifications: string[]
  clearanceLevel?: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  address?: string
}

export interface ProposalContext {
  solicitationNumber?: string
  contractTitle: string
  agencyName: string
  issuingOffice?: string
  responseDeadline?: string
  estimatedValue?: string
  placeOfPerformance?: string
}

export function generateProposal(company: CompanyData, ctx: ProposalContext): string {
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const businessTypes = company.businessTypes.join(', ') || 'Small Business'
  const naics = company.naicsCodes[0] || '[PRIMARY NAICS]'
  const allNaics = company.naicsCodes.join(', ') || '[NAICS CODES]'
  const certs = company.certifications.join(', ') || 'None'
  const clearance = company.clearanceLevel ? `\nSecurity Clearance: ${company.clearanceLevel}` : ''

  return `================================================================================
                           TECHNICAL AND MANAGEMENT PROPOSAL
================================================================================

CONTRACT TITLE:      ${ctx.contractTitle}
SOLICITATION NO.:    ${ctx.solicitationNumber || '[SOLICITATION NUMBER]'}
ISSUING AGENCY:      ${ctx.agencyName}
ISSUING OFFICE:      ${ctx.issuingOffice || '[ISSUING OFFICE / CONTRACTING ACTIVITY]'}
SUBMITTED BY:        ${company.companyName}
DATE:                ${today}
RESPONSE DEADLINE:   ${ctx.responseDeadline || '[RESPONSE DUE DATE]'}

================================================================================
                              OFFEROR INFORMATION
================================================================================

Legal Business Name:   ${company.companyName}
UEI (SAM.gov):         ${company.uei || '[UEI — Unique Entity ID]'}
CAGE Code:             ${company.cageCode || '[CAGE CODE]'}
Business Address:      ${company.address || '[STREET ADDRESS, CITY, STATE, ZIP]'}
Website:               ${company.website || '[COMPANY WEBSITE]'}
Business Type(s):      ${businessTypes}
Primary NAICS Code:    ${naics}
All NAICS Codes:       ${allNaics}
Certifications:        ${certs}${clearance}
${company.yearFounded ? `Year Established:      ${company.yearFounded}` : ''}

Point of Contact for this Proposal:
  Name:    ${company.contactName || '[AUTHORIZED REPRESENTATIVE NAME]'}
  Title:   [TITLE]
  Email:   ${company.contactEmail || '[EMAIL ADDRESS]'}
  Phone:   ${company.contactPhone || '[PHONE NUMBER]'}

================================================================================
                            TABLE OF CONTENTS
================================================================================

  VOLUME I  — TECHNICAL APPROACH
    Section 1.0    Executive Summary
    Section 2.0    Understanding of the Requirement
    Section 3.0    Technical Approach and Methodology
    Section 4.0    Quality Assurance and Risk Management

  VOLUME II — MANAGEMENT APPROACH
    Section 5.0    Management Structure and Key Personnel
    Section 6.0    Staffing Plan and Subcontracting
    Section 7.0    Transition Plan

  VOLUME III — PAST PERFORMANCE
    Section 8.0    Relevant Past Performance
    Section 9.0    References

  VOLUME IV — PRICE/COST SUMMARY
    Section 10.0   Price/Cost Cover Sheet

================================================================================
                     VOLUME I — TECHNICAL APPROACH
================================================================================

SECTION 1.0  EXECUTIVE SUMMARY
───────────────────────────────

${company.companyName} is pleased to submit this proposal in response to the
${ctx.agencyName} solicitation for ${ctx.contractTitle} (${ctx.solicitationNumber || 'the above-referenced solicitation'}).

We are a ${businessTypes} with proven expertise in delivering high-quality
solutions to federal government clients. ${company.yearFounded ? `Established in ${company.yearFounded}, we` : 'We'} bring
deep domain knowledge, a track record of successful contract performance, and a
dedicated team committed to mission success.

This proposal presents our technical approach, management plan, past performance,
and price structure. We are confident that our qualifications, experience, and
proposed approach make us the best-value offeror for this requirement.

Key Strengths:
  • [KEY STRENGTH 1 — tailored to solicitation requirements]
  • [KEY STRENGTH 2 — unique differentiator your company offers]
  • [KEY STRENGTH 3 — relevant certifications or cleared personnel]
  • [KEY STRENGTH 4 — cost efficiency or schedule certainty]
  • [KEY STRENGTH 5 — past performance similarity to this requirement]

───────────────────────────────
SECTION 2.0  UNDERSTANDING OF THE REQUIREMENT
───────────────────────────────

${company.companyName} has thoroughly reviewed the Performance Work Statement
(PWS) / Statement of Work (SOW) and all attachments. We understand that
${ctx.agencyName} requires [SUMMARIZE THE CORE REQUIREMENT IN YOUR OWN WORDS].

The primary objectives of this requirement are:
  1. [OBJECTIVE 1 — drawn directly from the solicitation]
  2. [OBJECTIVE 2]
  3. [OBJECTIVE 3]

Key performance requirements we identified:
  • [CRITICAL REQUIREMENT 1]
  • [CRITICAL REQUIREMENT 2]
  • [CRITICAL REQUIREMENT 3]

Our proposed approach fully addresses each requirement. Where the solicitation
leaves performance standards flexible, we have applied industry best practices
and federal acquisition standards (FAR/DFARS as applicable) to define clear,
measurable outcomes.

───────────────────────────────
SECTION 3.0  TECHNICAL APPROACH AND METHODOLOGY
───────────────────────────────

3.1  Overall Approach

${company.companyName} will employ the following methodology to deliver
${ctx.contractTitle}:

[DESCRIBE YOUR CORE TECHNICAL APPROACH. Be specific to the solicitation.
Reference any standards, frameworks, or methodologies (e.g., PMBOK, Agile/SAFe,
ITIL, NIST frameworks) relevant to the work. Explain HOW you will perform the
work, not just WHAT you will do.]

3.2  Phase 1 — [PHASE NAME, e.g., "Mobilization and Planning"]

Timeline: [WEEKS/MONTHS]

Deliverables:
  • [DELIVERABLE 1 — cite the PWS/SOW reference if applicable]
  • [DELIVERABLE 2]
  • [DELIVERABLE 3]

Approach: [DESCRIBE ACTIVITIES, METHODS, AND TOOLS FOR THIS PHASE]

3.3  Phase 2 — [PHASE NAME, e.g., "Execution and Delivery"]

Timeline: [WEEKS/MONTHS]

Deliverables:
  • [DELIVERABLE 1]
  • [DELIVERABLE 2]
  • [DELIVERABLE 3]

Approach: [DESCRIBE ACTIVITIES, METHODS, AND TOOLS FOR THIS PHASE]

3.4  Phase 3 — [PHASE NAME, e.g., "Transition and Close-out"]

Timeline: [WEEKS/MONTHS]

Deliverables:
  • [DELIVERABLE 1]
  • [CLOSE-OUT REPORT / LESSONS LEARNED]

Approach: [DESCRIBE TRANSITION ACTIVITIES]

3.5  Tools, Technologies, and Systems

${company.companyName} will utilize the following tools and systems:
  • [TOOL / TECHNOLOGY 1 — explain relevance]
  • [TOOL / TECHNOLOGY 2]
  • [TOOL / TECHNOLOGY 3]
  • [ANY GOVERNMENT-FURNISHED EQUIPMENT / INFORMATION (GFE/GFI) TO BE USED]

3.6  Place of Performance
${ctx.placeOfPerformance ? `  ${ctx.placeOfPerformance}` : '  [CITY, STATE / REMOTE / ON-SITE AT GOVERNMENT FACILITY]'}

───────────────────────────────
SECTION 4.0  QUALITY ASSURANCE AND RISK MANAGEMENT
───────────────────────────────

4.1  Quality Control Plan

${company.companyName} maintains a formal Quality Control Plan (QCP) that includes:

  • Independent review of all deliverables prior to submission
  • [QUALITY STANDARD — e.g., ISO 9001, CMMI Level [X], internal QA process]
  • Defined acceptance criteria tied to Performance Work Statement metrics
  • Structured feedback loops with the Contracting Officer's Representative (COR)
  • Corrective Action Procedures (CAP) to address any deficiencies within [X] days

4.2  Risk Management

Identified risks and mitigation strategies:

  RISK 1: [DESCRIBE RISK — e.g., personnel availability]
  LIKELIHOOD: Low / Medium / High
  IMPACT: Low / Medium / High
  MITIGATION: [HOW YOU WILL PREVENT OR MANAGE THIS RISK]

  RISK 2: [DESCRIBE RISK — e.g., technology integration]
  LIKELIHOOD: Low / Medium / High
  IMPACT: Low / Medium / High
  MITIGATION: [HOW YOU WILL PREVENT OR MANAGE THIS RISK]

  RISK 3: [DESCRIBE RISK — e.g., schedule compression]
  LIKELIHOOD: Low / Medium / High
  IMPACT: Low / Medium / High
  MITIGATION: [HOW YOU WILL PREVENT OR MANAGE THIS RISK]

================================================================================
                    VOLUME II — MANAGEMENT APPROACH
================================================================================

SECTION 5.0  MANAGEMENT STRUCTURE AND KEY PERSONNEL
───────────────────────────────

5.1  Organizational Structure

[INSERT OR DESCRIBE ORGANIZATIONAL CHART — show reporting relationships between
Program Manager, Task Leaders, and supporting staff]

5.2  Key Personnel

Program Manager: [NAME]
  Qualifications: [EDUCATION, CLEARANCE, YEARS OF RELEVANT EXPERIENCE]
  Role: Overall contract performance, primary government interface, deliverable oversight

Technical Lead: [NAME]
  Qualifications: [EDUCATION, CLEARANCE, YEARS OF RELEVANT EXPERIENCE]
  Role: [SPECIFIC TECHNICAL RESPONSIBILITIES]

[ADDITIONAL KEY PERSONNEL AS REQUIRED BY THE SOLICITATION]

  NOTE: Resumes for all key personnel are provided in Attachment [X] to this proposal.

5.3  Labor Category Mix

Labor Category                 FTE     % of Effort
──────────────────────────────────────────────────
Program Manager                [X]        [X]%
[CATEGORY 2]                   [X]        [X]%
[CATEGORY 3]                   [X]        [X]%
[CATEGORY 4]                   [X]        [X]%
──────────────────────────────────────────────────
TOTAL                          [X]       100%

───────────────────────────────
SECTION 6.0  STAFFING PLAN AND SUBCONTRACTING
───────────────────────────────

6.1  Staffing Approach

${company.companyName} maintains a pipeline of qualified personnel and has
identified [X] candidates to fill critical positions upon contract award. All
personnel will have appropriate clearances and qualifications prior to
performance start.

6.2  Subcontracting / Teaming

[IF TEAMING]: ${company.companyName} will partner with [SUBCONTRACTOR NAME]
to supplement our capabilities in [SPECIFIC AREA]. [SUBCONTRACTOR NAME] brings
[X] years of experience in [RELEVANT AREA].

[IF NO TEAMING]: ${company.companyName} will perform [X]% of contract work
using our own resources.

Small Business Subcontracting Goals (if applicable):
  Small Business:                 [X]%
  Small Disadvantaged Business:   [X]%
  WOSB:                           [X]%
  HUBZone:                        [X]%
  SDVOSB:                         [X]%

───────────────────────────────
SECTION 7.0  TRANSITION PLAN
───────────────────────────────

${company.companyName} proposes a [X]-day transition period, during which we will:

  Week 1–2:  [TRANSITION ACTIVITIES — e.g., incumbent knowledge transfer,
              system access provisioning, staff on-boarding]
  Week 3–4:  [TRANSITION ACTIVITIES — e.g., parallel operations, documentation
              review, process familiarization]
  Day [X]:   Full operational capability achieved

Risks to transition and mitigation:
  • [TRANSITION RISK 1 AND MITIGATION]
  • [TRANSITION RISK 2 AND MITIGATION]

================================================================================
                    VOLUME III — PAST PERFORMANCE
================================================================================

SECTION 8.0  RELEVANT PAST PERFORMANCE
───────────────────────────────

The following contracts demonstrate ${company.companyName}'s relevant experience
and ability to perform the requirements of ${ctx.contractTitle}.

──────────────────────────────────────────────────────────────────────────────
CONTRACT 1
──────────────────────────────────────────────────────────────────────────────
Contract Title:          [CONTRACT / PROJECT TITLE]
Contracting Agency:      [FEDERAL AGENCY NAME]
Contract Number:         [CONTRACT NUMBER]
Contract Type:           [FIRM FIXED PRICE / T&M / COST PLUS / IDIQ]
Total Contract Value:    $[VALUE]
Period of Performance:   [MM/YYYY] – [MM/YYYY]
NAICS Code:              [NAICS]
Place of Performance:    [CITY, STATE OR REMOTE]
Prime or Sub:            [PRIME / SUBCONTRACTOR]
% of Work Performed:     [X]% (if subcontractor)

Description of Work:
  [2–4 sentences describing the scope of work performed. Emphasize relevance
  to this solicitation's requirements. Include technologies used, mission
  supported, and scale of effort.]

Relevance to This Requirement:
  [Explain specifically how this contract demonstrates capability relevant to
  the current solicitation. Reference PWS/SOW sections where applicable.]

Outcomes and Achievements:
  • [MEASURABLE RESULT — e.g., delivered on schedule across all X task orders]
  • [MEASURABLE RESULT — e.g., achieved X% cost savings through Y approach]
  • [MEASURABLE RESULT — e.g., zero deficiencies on CPARS evaluation]

──────────────────────────────────────────────────────────────────────────────
CONTRACT 2
──────────────────────────────────────────────────────────────────────────────
Contract Title:          [CONTRACT / PROJECT TITLE]
Contracting Agency:      [FEDERAL AGENCY NAME]
Contract Number:         [CONTRACT NUMBER]
Contract Type:           [FIRM FIXED PRICE / T&M / COST PLUS / IDIQ]
Total Contract Value:    $[VALUE]
Period of Performance:   [MM/YYYY] – [MM/YYYY]
NAICS Code:              [NAICS]
Place of Performance:    [CITY, STATE OR REMOTE]
Prime or Sub:            [PRIME / SUBCONTRACTOR]
% of Work Performed:     [X]% (if subcontractor)

Description of Work:
  [2–4 sentences describing the scope of work performed.]

Relevance to This Requirement:
  [Explain relevance to current solicitation.]

Outcomes and Achievements:
  • [MEASURABLE RESULT]
  • [MEASURABLE RESULT]
  • [MEASURABLE RESULT]

──────────────────────────────────────────────────────────────────────────────
CONTRACT 3
──────────────────────────────────────────────────────────────────────────────
Contract Title:          [CONTRACT / PROJECT TITLE]
Contracting Agency:      [FEDERAL AGENCY NAME]
Contract Number:         [CONTRACT NUMBER]
Contract Type:           [FIRM FIXED PRICE / T&M / COST PLUS / IDIQ]
Total Contract Value:    $[VALUE]
Period of Performance:   [MM/YYYY] – [MM/YYYY]
NAICS Code:              [NAICS]
Place of Performance:    [CITY, STATE OR REMOTE]
Prime or Sub:            [PRIME / SUBCONTRACTOR]
% of Work Performed:     [X]% (if subcontractor)

Description of Work:
  [2–4 sentences describing the scope of work performed.]

Relevance to This Requirement:
  [Explain relevance to current solicitation.]

Outcomes and Achievements:
  • [MEASURABLE RESULT]
  • [MEASURABLE RESULT]
  • [MEASURABLE RESULT]

───────────────────────────────
SECTION 9.0  REFERENCES
───────────────────────────────

References are available for all contracts listed above. The following
individuals have authorized ${company.companyName} to provide their contact
information as part of this proposal:

Reference 1 — [CONTRACT 1 TITLE]
  Name:    [CONTRACTING OFFICER / COR NAME]
  Title:   [TITLE]
  Agency:  [AGENCY]
  Phone:   [PHONE]
  Email:   [EMAIL]

Reference 2 — [CONTRACT 2 TITLE]
  Name:    [CONTRACTING OFFICER / COR NAME]
  Title:   [TITLE]
  Agency:  [AGENCY]
  Phone:   [PHONE]
  Email:   [EMAIL]

Reference 3 — [CONTRACT 3 TITLE]
  Name:    [CONTRACTING OFFICER / COR NAME]
  Title:   [TITLE]
  Agency:  [AGENCY]
  Phone:   [PHONE]
  Email:   [EMAIL]

================================================================================
                    VOLUME IV — PRICE / COST SUMMARY
================================================================================

SECTION 10.0  PRICE / COST COVER SHEET
───────────────────────────────

  Offeror:              ${company.companyName}
  Solicitation No.:     ${ctx.solicitationNumber || '[SOLICITATION NUMBER]'}
  Date:                 ${today}

  ┌─────────────────────────────────────────────────────────────────────────┐
  │                      TOTAL PROPOSED PRICE SUMMARY                      │
  ├──────────────────────────────────┬──────────────────────────────────────┤
  │  Base Year (Option Period 0)     │  $[BASE YEAR PRICE]                  │
  │  Option Year 1                   │  $[OY1 PRICE]                        │
  │  Option Year 2                   │  $[OY2 PRICE]                        │
  │  Option Year 3                   │  $[OY3 PRICE]                        │
  │  Option Year 4                   │  $[OY4 PRICE]                        │
  ├──────────────────────────────────┼──────────────────────────────────────┤
  │  TOTAL (All Periods)             │  $[TOTAL CONTRACT VALUE]             │
  └──────────────────────────────────┴──────────────────────────────────────┘

  NOTE: Detailed price/cost buildup by labor category, ODCs, and subcontractor
  costs are provided in the Price Volume (submitted separately per the solicitation
  instructions or on the required government forms, e.g., SF-1449, SF-33).

  Estimated Performance Period:  ${ctx.responseDeadline ? `Award after ${ctx.responseDeadline}` : '[PERIOD OF PERFORMANCE]'}
  Place of Performance:          ${ctx.placeOfPerformance || '[CITY, STATE / REMOTE]'}

  Acknowledgment of Amendments:  [AMEND. NO(S). — list all amendments acknowledged]

  By submitting this proposal, ${company.companyName} confirms that all prices
  are valid for [90] days from the proposal submission date, and that we are
  registered and active in SAM.gov.

  Authorized Signature:  ________________________________
  Name:                  ${company.contactName || '[AUTHORIZED REPRESENTATIVE]'}
  Title:                 [TITLE]
  Date:                  ${today}

================================================================================
                        CERTIFICATIONS AND REPRESENTATIONS
================================================================================

${company.companyName} hereby certifies, to the best of its knowledge and belief,
that the information and data contained in this proposal are accurate and complete,
that the proposed prices were arrived at independently and without collusion, and
that no final agreement on price has been reached with any other offeror.

The offeror represents that it is registered and active in SAM.gov, maintains
all required certifications, and is in compliance with applicable laws and
regulations, including FAR 52.209-5 (Certification Regarding Responsibility
Matters) and FAR 52.222-22 (Previous Contracts and Compliance Reports).

Business Type Certification:
  ${businessTypes}
  UEI: ${company.uei || '[UEI]'}
  CAGE: ${company.cageCode || '[CAGE CODE]'}

________________________________________________________________________________
NOTE: This proposal was structured using IR — Government Contract Intelligence.
All bracketed fields [LIKE THIS] must be completed with your specific information
before submission. Review all content with qualified proposal and legal counsel
prior to formal submission to any federal agency.
================================================================================
`
}
