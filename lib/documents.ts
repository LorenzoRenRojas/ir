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
  const businessTypes = esc(company.businessTypes.join(', ') || 'Small Business')
  const certs = company.certifications.join(', ') || 'None'
  const certsHtml = esc(certs)
  const name = esc(company.companyName)
  const naics = esc(q.naicsCode || company.naicsCodes[0] || '[NAICS]')

  // Turn newline-separated free text into <li> items (escaped), with a fallback.
  const bulletsFrom = (s: string, fallback: string[]): string => {
    const items = s.split('\n').map((l) => l.trim()).filter(Boolean)
    return li((items.length ? items : fallback).map(esc))
  }
  const numberedFrom = (s: string, fallback: string[]): string => {
    const items = s.split('\n').map((l) => l.trim().replace(/^\d+[.)]\s*/, '')).filter(Boolean)
    return `<ol>${(items.length ? items : fallback).map((i) => `<li>${esc(i)}</li>`).join('')}</ol>`
  }

  const ppSection = q.pp.map((p, i) => `<h3>Contract ${i + 1} — ${esc(p.title)}</h3>
<p><strong>Contracting Agency:</strong> ${esc(p.agency)}<br><strong>Contract Number:</strong> ${esc(p.contractNumber)}<br><strong>Contract Type:</strong> ${esc(p.contractType)}<br><strong>Total Contract Value:</strong> ${esc(p.value)}<br><strong>Period of Performance:</strong> ${esc(p.startDate)} – ${esc(p.endDate)}<br><strong>NAICS Code:</strong> ${naics}<br><strong>Place of Performance:</strong> ${esc(q.placeOfPerformance)}<br><strong>Prime or Sub:</strong> Prime</p>
<p><strong>Description of Work:</strong><br>${esc(p.description)}</p>
<p><strong>Relevance to This Requirement:</strong><br>${esc(p.relevance)}</p>
<p><strong>Outcomes and Achievements:</strong></p>
${bulletsFrom(p.outcomes, ['[Measurable result]'])}`).join('')

  const ppRefs = q.pp.map((p, i) => `<p><strong>Reference ${i + 1} — ${esc(p.title)}</strong><br>Name: ${esc(p.refName)}<br>Title: ${esc(p.refTitle)}<br>Agency: ${esc(p.agency)}<br>Phone: ${esc(p.refPhone)}<br>Email: ${esc(p.refEmail)}</p>`).join('')

  const riskItems = q.risks.filter((r) => r.description).map((r) =>
    `<strong>Risk:</strong> ${esc(r.description)} — <strong>Likelihood:</strong> ${esc(r.likelihood || 'Medium')}, <strong>Impact:</strong> ${esc(r.impact || 'Medium')}. <strong>Mitigation:</strong> ${esc(r.mitigation)}`)
  const riskSection = riskItems.length
    ? li(riskItems)
    : '<p>[Risk register — describe identified risks and mitigations.]</p>'

  const subSection = q.subName
    ? `${name} will team with ${esc(q.subName)} to provide ${esc(q.subRole)}. ${esc(q.subName)} will perform approximately ${esc(q.subPercent)}% of the contract work.`
    : `${name} will perform 100% of contract work using our own resources.`

  const computedTotal = q.totalPrice || (() => {
    const vals = [q.baseYear, q.oy1, q.oy2, q.oy3, q.oy4]
      .map((v) => parseFloat(v.replace(/[$,]/g, '')) || 0)
    const t = vals.reduce((a, b) => a + b, 0)
    return t > 0 ? `$${t.toLocaleString()}` : '[TOTAL]'
  })()

  return `<h1>Technical and Management Proposal</h1>
<p><strong>Contract Title:</strong> ${esc(q.contractTitle)}<br><strong>Solicitation No.:</strong> ${esc(q.solicitationNumber) || '[Solicitation Number]'}<br><strong>Issuing Agency:</strong> ${esc(q.agencyName)}<br><strong>Issuing Office:</strong> ${esc(q.issuingOffice) || '[Issuing Office]'}<br><strong>Submitted By:</strong> ${name}<br><strong>Date:</strong> ${today}<br><strong>Response Deadline:</strong> ${esc(q.responseDeadline) || '[Response Deadline]'}</p>
<hr>
<h2>Offeror Information</h2>
<p>Legal Business Name: ${name}<br>UEI (SAM.gov): ${esc(company.uei) || '[UEI]'}<br>CAGE Code: ${esc(company.cageCode) || '[CAGE Code]'}<br>Business Address: ${esc(company.address) || '[Address]'}<br>Website: ${esc(company.website) || '[Website]'}<br>Business Type(s): ${businessTypes}<br>Primary NAICS Code: ${naics}<br>Certifications: ${certsHtml}${company.clearanceLevel ? `<br>Security Clearance: ${esc(company.clearanceLevel)}` : ''}${company.yearFounded ? `<br>Year Established: ${esc(company.yearFounded)}` : ''}</p>
<p><strong>Point of Contact:</strong><br>Name: ${esc(company.contactName) || '[POC Name]'}<br>Email: ${esc(company.contactEmail) || '[Email]'}<br>Phone: ${esc(company.contactPhone) || '[Phone]'}</p>
<hr>
<h1>Volume I — Technical Approach</h1>
<h2>1.0 Executive Summary</h2>
<p>${name} is pleased to submit this proposal in response to the ${esc(q.agencyName)} solicitation for ${esc(q.contractTitle)}${q.solicitationNumber ? ` (${esc(q.solicitationNumber)})` : ''}.</p>
<p>We are a ${businessTypes}${company.yearFounded ? `, established in ${esc(company.yearFounded)},` : ''} with proven expertise delivering high-quality solutions to federal government clients.</p>
<p><strong>Key Strengths We Bring to This Requirement:</strong></p>
${li([
    ...q.overallApproach.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 3).map(esc),
    certs !== 'None' ? `Active certifications: ${certsHtml}` : `Registered ${businessTypes} in SAM.gov`,
    `Proven past performance with similar federal requirements${q.pp[0]?.agency ? ` (including ${esc(q.pp[0].agency)})` : ''}`,
  ])}
<h2>2.0 Understanding of the Requirement</h2>
<p>${q.requirementSummary ? esc(q.requirementSummary) : `${name} has thoroughly reviewed the solicitation and all attachments. We understand that ${esc(q.agencyName)} requires the services described in ${esc(q.contractTitle)}.`}</p>
<p><strong>Primary Objectives:</strong></p>
${numberedFrom(q.keyObjectives, ['[Key objective 1]', '[Key objective 2]', '[Key objective 3]'])}
<h2>3.0 Technical Approach and Methodology</h2>
<h3>3.1 Overall Approach</h3>
<p>${esc(q.overallApproach)}</p>
<h3>3.2 ${esc(q.phase1.name) || 'Phase 1 — Mobilization and Planning'}</h3>
<p>Timeline: ${esc(q.phase1.timeline) || '[Timeline]'}</p>
<p><strong>Deliverables:</strong></p>
${bulletsFrom(q.phase1.deliverables, ['[Deliverable]'])}
<p><strong>Approach:</strong><br>${esc(q.phase1.approach)}</p>
<h3>3.3 ${esc(q.phase2.name) || 'Phase 2 — Execution'}</h3>
<p>Timeline: ${esc(q.phase2.timeline) || '[Timeline]'}</p>
<p><strong>Deliverables:</strong></p>
${bulletsFrom(q.phase2.deliverables, ['[Deliverable]'])}
<p><strong>Approach:</strong><br>${esc(q.phase2.approach)}</p>
${q.phase3.name ? `<h3>3.4 ${esc(q.phase3.name)}</h3>
<p>Timeline: ${esc(q.phase3.timeline) || '[Timeline]'}</p>
<p><strong>Deliverables:</strong></p>
${bulletsFrom(q.phase3.deliverables, ['[Deliverable]'])}
<p><strong>Approach:</strong><br>${esc(q.phase3.approach)}</p>
` : ''}<h3>3.5 Tools, Technologies, and Systems</h3>
<p>${esc(q.toolsTechnologies) || '[List tools and technologies]'}</p>
<h3>3.6 Place of Performance</h3>
<p>${esc(q.placeOfPerformance) || '[Place of Performance]'}</p>
<h2>4.0 Quality Assurance and Risk Management</h2>
<h3>4.1 Quality Control Plan</h3>
<p>${esc(q.qualityApproach) || '[Describe quality control approach]'}</p>
<h3>4.2 Risk Management</h3>
${riskSection}
<hr>
<h1>Volume II — Management Approach</h1>
<h2>5.0 Management Structure and Key Personnel</h2>
<p><strong>Program Manager:</strong> ${esc(q.pm.name)}<br>Title: ${esc(q.pm.title)}<br>Clearance: ${esc(q.pm.clearance) || 'N/A'}<br>Experience: ${esc(q.pm.experience)} years of relevant experience<br>Qualifications: ${esc(q.pm.quals)}</p>
<p><strong>Technical Lead:</strong> ${esc(q.techLead.name)}<br>Title: ${esc(q.techLead.title)}<br>Clearance: ${esc(q.techLead.clearance) || 'N/A'}<br>Experience: ${esc(q.techLead.experience)} years of relevant experience<br>Qualifications: ${esc(q.techLead.quals)}</p>
${q.additionalPersonnel ? `<p><strong>Additional Key Personnel:</strong><br>${esc(q.additionalPersonnel)}</p>` : ''}
<h2>6.0 Staffing Plan and Subcontracting</h2>
<p>${subSection}</p>
<p>Prime contractor share of work: ${esc(q.primePercent) || '100'}%</p>
<h2>7.0 Transition Plan</h2>
<p>${name} will execute a structured transition to ensure continuity of operations from contract award through full operational capability.</p>
${li([
    'Week 1–2: Kickoff meeting, access provisioning, documentation review',
    'Week 3–4: Staff on-boarding, system familiarization, process handoff',
    `Day 30: Full operational capability confirmed with ${esc(q.agencyName)} COR`,
  ])}
<hr>
<h1>Volume III — Past Performance</h1>
<h2>8.0 Relevant Past Performance</h2>
${ppSection}
<h2>9.0 References</h2>
${ppRefs}
<hr>
<h1>Volume IV — Price / Cost Summary</h1>
<h2>10.0 Price / Cost Cover Sheet</h2>
<p>Offeror: ${name}<br>Solicitation No.: ${esc(q.solicitationNumber) || '[Solicitation Number]'}<br>Date: ${today}</p>
<p><strong>Total Proposed Price Summary</strong></p>
<p>Base Year: ${esc(q.baseYear) || '[TBD]'}<br>Option Year 1: ${esc(q.oy1) || '[TBD]'}<br>Option Year 2: ${esc(q.oy2) || '[TBD]'}<br>Option Year 3: ${esc(q.oy3) || '[TBD]'}<br>Option Year 4: ${esc(q.oy4) || '[TBD]'}<br><strong>Total (All Periods): ${esc(computedTotal)}</strong></p>
<p>Acknowledgment of Amendments: ${esc(q.amendments) || 'None'}</p>
<p>Authorized Signature: ________________________________<br>Name: ${esc(company.contactName) || '[Authorized Representative]'}<br>Title: [Title]<br>Date: ${today}</p>
<hr>
<h2>Certifications and Representations</h2>
<p>${name} certifies that the information in this proposal is accurate and complete, that prices were arrived at independently and without collusion, and that we are registered and active in SAM.gov.</p>
<p>Business Type: ${businessTypes}<br>UEI: ${esc(company.uei) || '[UEI]'}<br>CAGE: ${esc(company.cageCode) || '[CAGE Code]'}</p>`
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
  const businessTypes = esc(company.businessTypes.join(', ') || 'Small Business')
  const naics = esc(company.naicsCodes[0] || '[Primary NAICS]')
  const allNaics = esc(company.naicsCodes.join(', ') || '[NAICS codes]')
  const certs = esc(company.certifications.join(', ') || 'None')
  const name = esc(company.companyName)
  const agency = esc(ctx.agencyName)
  const contractTitle = esc(ctx.contractTitle)

  return `<h1>Technical and Management Proposal</h1>
<p><strong>Contract Title:</strong> ${contractTitle}<br><strong>Solicitation No.:</strong> ${esc(ctx.solicitationNumber) || '[Solicitation Number]'}<br><strong>Issuing Agency:</strong> ${agency}<br><strong>Issuing Office:</strong> ${esc(ctx.issuingOffice) || '[Issuing Office / Contracting Activity]'}<br><strong>Submitted By:</strong> ${name}<br><strong>Date:</strong> ${today}<br><strong>Response Deadline:</strong> ${esc(ctx.responseDeadline) || '[Response Due Date]'}</p>
<hr>
<h2>Offeror Information</h2>
<p>Legal Business Name: ${name}<br>UEI (SAM.gov): ${esc(company.uei) || '[UEI — Unique Entity ID]'}<br>CAGE Code: ${esc(company.cageCode) || '[CAGE Code]'}<br>Business Address: ${esc(company.address) || '[Street Address, City, State, ZIP]'}<br>Website: ${esc(company.website) || '[Company Website]'}<br>Business Type(s): ${businessTypes}<br>Primary NAICS Code: ${naics}<br>All NAICS Codes: ${allNaics}<br>Certifications: ${certs}${company.clearanceLevel ? `<br>Security Clearance: ${esc(company.clearanceLevel)}` : ''}${company.yearFounded ? `<br>Year Established: ${esc(company.yearFounded)}` : ''}</p>
<p><strong>Point of Contact for this Proposal:</strong><br>Name: ${esc(company.contactName) || '[Authorized Representative Name]'}<br>Title: [Title]<br>Email: ${esc(company.contactEmail) || '[Email Address]'}<br>Phone: ${esc(company.contactPhone) || '[Phone Number]'}</p>
<hr>
<h1>Volume I — Technical Approach</h1>
<h2>1.0 Executive Summary</h2>
<p>${name} is pleased to submit this proposal in response to the ${agency} solicitation for ${contractTitle} (${esc(ctx.solicitationNumber) || 'the above-referenced solicitation'}).</p>
<p>We are a ${businessTypes} with proven expertise in delivering high-quality solutions to federal government clients. ${company.yearFounded ? `Established in ${esc(company.yearFounded)}, we` : 'We'} bring deep domain knowledge, a track record of successful contract performance, and a dedicated team committed to mission success.</p>
<p>This proposal presents our technical approach, management plan, past performance, and price structure. We are confident that our qualifications, experience, and proposed approach make us the best-value offeror for this requirement.</p>
<p><strong>Key Strengths:</strong></p>
<ul><li>[Key strength 1 — tailored to solicitation requirements]</li><li>[Key strength 2 — unique differentiator your company offers]</li><li>[Key strength 3 — relevant certifications or cleared personnel]</li><li>[Key strength 4 — cost efficiency or schedule certainty]</li><li>[Key strength 5 — past performance similarity to this requirement]</li></ul>
<h2>2.0 Understanding of the Requirement</h2>
<p>${name} has thoroughly reviewed the Performance Work Statement (PWS) / Statement of Work (SOW) and all attachments. We understand that ${agency} requires [summarize the core requirement in your own words].</p>
<p><strong>The primary objectives of this requirement are:</strong></p>
<ol><li>[Objective 1 — drawn directly from the solicitation]</li><li>[Objective 2]</li><li>[Objective 3]</li></ol>
<p><strong>Key performance requirements we identified:</strong></p>
<ul><li>[Critical requirement 1]</li><li>[Critical requirement 2]</li><li>[Critical requirement 3]</li></ul>
<p>Our proposed approach fully addresses each requirement. Where the solicitation leaves performance standards flexible, we have applied industry best practices and federal acquisition standards (FAR/DFARS as applicable) to define clear, measurable outcomes.</p>
<h2>3.0 Technical Approach and Methodology</h2>
<h3>3.1 Overall Approach</h3>
<p>${name} will employ a disciplined methodology to deliver ${contractTitle}. [Describe your core technical approach. Be specific to the solicitation. Reference any standards, frameworks, or methodologies (e.g., PMBOK, Agile/SAFe, ITIL, NIST frameworks) relevant to the work. Explain HOW you will perform the work, not just WHAT you will do.]</p>
<h3>3.2 Phase 1 — [Phase Name, e.g., "Mobilization and Planning"]</h3>
<p>Timeline: [Weeks/Months]</p>
<p><strong>Deliverables:</strong></p>
<ul><li>[Deliverable 1 — cite the PWS/SOW reference if applicable]</li><li>[Deliverable 2]</li><li>[Deliverable 3]</li></ul>
<p><strong>Approach:</strong> [Describe activities, methods, and tools for this phase.]</p>
<h3>3.3 Phase 2 — [Phase Name, e.g., "Execution and Delivery"]</h3>
<p>Timeline: [Weeks/Months]</p>
<p><strong>Deliverables:</strong></p>
<ul><li>[Deliverable 1]</li><li>[Deliverable 2]</li><li>[Deliverable 3]</li></ul>
<p><strong>Approach:</strong> [Describe activities, methods, and tools for this phase.]</p>
<h3>3.4 Phase 3 — [Phase Name, e.g., "Transition and Close-out"]</h3>
<p>Timeline: [Weeks/Months]</p>
<p><strong>Deliverables:</strong></p>
<ul><li>[Deliverable 1]</li><li>[Close-out report / lessons learned]</li></ul>
<p><strong>Approach:</strong> [Describe transition activities.]</p>
<h3>3.5 Tools, Technologies, and Systems</h3>
<ul><li>[Tool / technology 1 — explain relevance]</li><li>[Tool / technology 2]</li><li>[Tool / technology 3]</li><li>[Any government-furnished equipment / information (GFE/GFI) to be used]</li></ul>
<h3>3.6 Place of Performance</h3>
<p>${esc(ctx.placeOfPerformance) || '[City, State / Remote / On-site at government facility]'}</p>
<h2>4.0 Quality Assurance and Risk Management</h2>
<h3>4.1 Quality Control Plan</h3>
<p>${name} maintains a formal Quality Control Plan (QCP) that includes:</p>
<ul><li>Independent review of all deliverables prior to submission</li><li>[Quality standard — e.g., ISO 9001, CMMI Level X, internal QA process]</li><li>Defined acceptance criteria tied to Performance Work Statement metrics</li><li>Structured feedback loops with the Contracting Officer's Representative (COR)</li><li>Corrective Action Procedures (CAP) to address any deficiencies within [X] days</li></ul>
<h3>4.2 Risk Management</h3>
<p><strong>Identified risks and mitigation strategies:</strong></p>
<ul><li><strong>Risk 1:</strong> [Describe risk — e.g., personnel availability]. Likelihood: Low/Medium/High. Impact: Low/Medium/High. Mitigation: [how you will prevent or manage this risk].</li><li><strong>Risk 2:</strong> [Describe risk — e.g., technology integration]. Likelihood: Low/Medium/High. Impact: Low/Medium/High. Mitigation: [how you will prevent or manage this risk].</li><li><strong>Risk 3:</strong> [Describe risk — e.g., schedule compression]. Likelihood: Low/Medium/High. Impact: Low/Medium/High. Mitigation: [how you will prevent or manage this risk].</li></ul>
<hr>
<h1>Volume II — Management Approach</h1>
<h2>5.0 Management Structure and Key Personnel</h2>
<h3>5.1 Organizational Structure</h3>
<p>[Insert or describe organizational chart — show reporting relationships between Program Manager, Task Leaders, and supporting staff.]</p>
<h3>5.2 Key Personnel</h3>
<p><strong>Program Manager:</strong> [Name]<br>Qualifications: [Education, clearance, years of relevant experience]<br>Role: Overall contract performance, primary government interface, deliverable oversight</p>
<p><strong>Technical Lead:</strong> [Name]<br>Qualifications: [Education, clearance, years of relevant experience]<br>Role: [Specific technical responsibilities]</p>
<p>[Additional key personnel as required by the solicitation.] Resumes for all key personnel are provided in Attachment [X] to this proposal.</p>
<h3>5.3 Labor Category Mix</h3>
<ul><li>Program Manager — [X] FTE, [X]% of effort</li><li>[Category 2] — [X] FTE, [X]% of effort</li><li>[Category 3] — [X] FTE, [X]% of effort</li><li>[Category 4] — [X] FTE, [X]% of effort</li></ul>
<h2>6.0 Staffing Plan and Subcontracting</h2>
<h3>6.1 Staffing Approach</h3>
<p>${name} maintains a pipeline of qualified personnel and has identified [X] candidates to fill critical positions upon contract award. All personnel will have appropriate clearances and qualifications prior to performance start.</p>
<h3>6.2 Subcontracting / Teaming</h3>
<p><strong>If teaming:</strong> ${name} will partner with [Subcontractor Name] to supplement our capabilities in [specific area]. [Subcontractor Name] brings [X] years of experience in [relevant area].</p>
<p><strong>If no teaming:</strong> ${name} will perform [X]% of contract work using our own resources.</p>
<p><strong>Small Business Subcontracting Goals (if applicable):</strong></p>
<ul><li>Small Business: [X]%</li><li>Small Disadvantaged Business: [X]%</li><li>WOSB: [X]%</li><li>HUBZone: [X]%</li><li>SDVOSB: [X]%</li></ul>
<h2>7.0 Transition Plan</h2>
<p>${name} proposes a [X]-day transition period, during which we will:</p>
<ul><li>Week 1–2: [Transition activities — e.g., incumbent knowledge transfer, system access provisioning, staff on-boarding]</li><li>Week 3–4: [Transition activities — e.g., parallel operations, documentation review, process familiarization]</li><li>Day [X]: Full operational capability achieved</li></ul>
<p><strong>Risks to transition and mitigation:</strong></p>
<ul><li>[Transition risk 1 and mitigation]</li><li>[Transition risk 2 and mitigation]</li></ul>
<hr>
<h1>Volume III — Past Performance</h1>
<h2>8.0 Relevant Past Performance</h2>
<p>The following contracts demonstrate ${name}'s relevant experience and ability to perform the requirements of ${contractTitle}.</p>
<h3>Contract 1</h3>
<p>Contract Title: [Contract / project title]<br>Contracting Agency: [Federal agency name]<br>Contract Number: [Contract number]<br>Contract Type: [Firm Fixed Price / T&amp;M / Cost Plus / IDIQ]<br>Total Contract Value: $[Value]<br>Period of Performance: [MM/YYYY] – [MM/YYYY]<br>NAICS Code: [NAICS]<br>Place of Performance: [City, State or Remote]<br>Prime or Sub: [Prime / Subcontractor]<br>% of Work Performed: [X]% (if subcontractor)</p>
<p><strong>Description of Work:</strong><br>[2–4 sentences describing the scope of work performed. Emphasize relevance to this solicitation's requirements. Include technologies used, mission supported, and scale of effort.]</p>
<p><strong>Relevance to This Requirement:</strong><br>[Explain specifically how this contract demonstrates capability relevant to the current solicitation. Reference PWS/SOW sections where applicable.]</p>
<p><strong>Outcomes and Achievements:</strong></p>
<ul><li>[Measurable result — e.g., delivered on schedule across all X task orders]</li><li>[Measurable result — e.g., achieved X% cost savings through Y approach]</li><li>[Measurable result — e.g., zero deficiencies on CPARS evaluation]</li></ul>
<h3>Contract 2</h3>
<p>Contract Title: [Contract / project title]<br>Contracting Agency: [Federal agency name]<br>Contract Number: [Contract number]<br>Contract Type: [Firm Fixed Price / T&amp;M / Cost Plus / IDIQ]<br>Total Contract Value: $[Value]<br>Period of Performance: [MM/YYYY] – [MM/YYYY]<br>NAICS Code: [NAICS]<br>Place of Performance: [City, State or Remote]<br>Prime or Sub: [Prime / Subcontractor]<br>% of Work Performed: [X]% (if subcontractor)</p>
<p><strong>Description of Work:</strong><br>[2–4 sentences describing the scope of work performed.]</p>
<p><strong>Relevance to This Requirement:</strong><br>[Explain relevance to current solicitation.]</p>
<p><strong>Outcomes and Achievements:</strong></p>
<ul><li>[Measurable result]</li><li>[Measurable result]</li><li>[Measurable result]</li></ul>
<h3>Contract 3</h3>
<p>Contract Title: [Contract / project title]<br>Contracting Agency: [Federal agency name]<br>Contract Number: [Contract number]<br>Contract Type: [Firm Fixed Price / T&amp;M / Cost Plus / IDIQ]<br>Total Contract Value: $[Value]<br>Period of Performance: [MM/YYYY] – [MM/YYYY]<br>NAICS Code: [NAICS]<br>Place of Performance: [City, State or Remote]<br>Prime or Sub: [Prime / Subcontractor]<br>% of Work Performed: [X]% (if subcontractor)</p>
<p><strong>Description of Work:</strong><br>[2–4 sentences describing the scope of work performed.]</p>
<p><strong>Relevance to This Requirement:</strong><br>[Explain relevance to current solicitation.]</p>
<p><strong>Outcomes and Achievements:</strong></p>
<ul><li>[Measurable result]</li><li>[Measurable result]</li><li>[Measurable result]</li></ul>
<h2>9.0 References</h2>
<p>References are available for all contracts listed above. The following individuals have authorized ${name} to provide their contact information as part of this proposal:</p>
<p><strong>Reference 1 — [Contract 1 title]</strong><br>Name: [Contracting Officer / COR name]<br>Title: [Title]<br>Agency: [Agency]<br>Phone: [Phone]<br>Email: [Email]</p>
<p><strong>Reference 2 — [Contract 2 title]</strong><br>Name: [Contracting Officer / COR name]<br>Title: [Title]<br>Agency: [Agency]<br>Phone: [Phone]<br>Email: [Email]</p>
<p><strong>Reference 3 — [Contract 3 title]</strong><br>Name: [Contracting Officer / COR name]<br>Title: [Title]<br>Agency: [Agency]<br>Phone: [Phone]<br>Email: [Email]</p>
<hr>
<h1>Volume IV — Price / Cost Summary</h1>
<h2>10.0 Price / Cost Cover Sheet</h2>
<p>Offeror: ${name}<br>Solicitation No.: ${esc(ctx.solicitationNumber) || '[Solicitation Number]'}<br>Date: ${today}</p>
<p><strong>Total Proposed Price Summary</strong></p>
<p>Base Year (Option Period 0): $[Base year price]<br>Option Year 1: $[OY1 price]<br>Option Year 2: $[OY2 price]<br>Option Year 3: $[OY3 price]<br>Option Year 4: $[OY4 price]<br><strong>Total (All Periods): $[Total contract value]</strong></p>
<p>Detailed price/cost buildup by labor category, ODCs, and subcontractor costs are provided in the Price Volume (submitted separately per the solicitation instructions or on the required government forms, e.g., SF-1449, SF-33).</p>
<p>Estimated Performance Period: ${ctx.responseDeadline ? `Award after ${esc(ctx.responseDeadline)}` : '[Period of Performance]'}<br>Place of Performance: ${esc(ctx.placeOfPerformance) || '[City, State / Remote]'}<br>Acknowledgment of Amendments: [Amend. No(s). — list all amendments acknowledged]</p>
<p>By submitting this proposal, ${name} confirms that all prices are valid for [90] days from the proposal submission date, and that we are registered and active in SAM.gov.</p>
<p>Authorized Signature: ________________________________<br>Name: ${esc(company.contactName) || '[Authorized Representative]'}<br>Title: [Title]<br>Date: ${today}</p>
<hr>
<h2>Certifications and Representations</h2>
<p>${name} hereby certifies, to the best of its knowledge and belief, that the information and data contained in this proposal are accurate and complete, that the proposed prices were arrived at independently and without collusion, and that no final agreement on price has been reached with any other offeror.</p>
<p>The offeror represents that it is registered and active in SAM.gov, maintains all required certifications, and is in compliance with applicable laws and regulations, including FAR 52.209-5 (Certification Regarding Responsibility Matters) and FAR 52.222-22 (Previous Contracts and Compliance Reports).</p>
<p><strong>Business Type Certification:</strong><br>${businessTypes}<br>UEI: ${esc(company.uei) || '[UEI]'}<br>CAGE: ${esc(company.cageCode) || '[CAGE Code]'}</p>
<p><em>All bracketed fields [like this] must be completed with your specific information before submission. Review all content with qualified proposal and legal counsel prior to formal submission to any federal agency.</em></p>`
}

// ─── Capability statement ─────────────────────────────────────────────────────
// The standard one-page GovCon marketing document — every contracting officer
// asks for one. Generated entirely from the company profile.

export interface CapabilityExtras {
  capabilityStatement?: string | null
  pastPerformance?: string | null
  contractVehicles?: string[]
  agencyHistory?: string[]
  orgSize?: string | null
  annualRevenue?: string | null
}

// Escape interpolated profile values so they can't break the generated HTML.
const esc = (s: unknown): string =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const li = (items: string[]) => `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`

// ─── Sources Sought / RFI response ────────────────────────────────────────────
// Agencies post Sources Sought notices before a solicitation exists to gauge
// the small-business market. Responding gets you on the radar and can shape the
// eventual RFP. Most small businesses never respond well — this is high leverage.
export interface SourcesSoughtOpts {
  noticeTitle: string
  agencyName: string
  solicitationNumber?: string
  requirementSummary?: string
}

export function generateSourcesSought(company: CompanyData, o: SourcesSoughtOpts): string {
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const certs = [...company.businessTypes, ...company.certifications]
  const setAsides = certs.length ? esc(certs.join(', ')) : '[your certifications]'
  const naics = company.naicsCodes.length ? esc(company.naicsCodes.join(', ')) : '[your NAICS codes]'
  const name = esc(company.companyName)

  return `<h1>Response to Sources Sought Notice</h1>
<p><strong>${esc(o.noticeTitle)}</strong><br>${esc(o.agencyName)}${o.solicitationNumber ? `<br>Notice / Reference No.: ${esc(o.solicitationNumber)}` : ''}<br>Date: ${today}</p>
<hr>
<h2>1. Firm Information</h2>
<p>Company Name: ${name}<br>UEI: ${esc(company.uei) || '[UEI]'}<br>CAGE Code: ${esc(company.cageCode) || '[CAGE]'}<br>Point of Contact: ${esc(company.contactName) || '[Name]'}<br>Email: ${esc(company.contactEmail) || '[Email]'}<br>Phone: ${esc(company.contactPhone) || '[Phone]'}<br>Business Size / Status: ${setAsides}<br>NAICS Codes: ${naics}</p>
<h2>2. Statement of Interest</h2>
<p>${name} is interested in and capable of performing the requirement described in the referenced notice. As a ${esc(company.businessTypes.join(', ')) || 'small'} business, we respectfully request consideration and, where applicable, that this requirement be structured as a small-business set-aside.</p>
<h2>3. Capability &amp; Relevant Experience</h2>
<p>${o.requirementSummary?.trim() ? esc(o.requirementSummary.trim()) : `${name} has directly relevant capability in the work described. [Summarize 2–3 sentences on how your firm meets this specific requirement — the systems, services, or expertise you bring.]`}</p>
<p>Our core competencies align to NAICS ${naics}. [List 3–5 specific, relevant capabilities and any comparable contracts of similar scope, size, and complexity — agency, value, period of performance.]</p>
<h2>4. Response to Specific Questions in the Notice</h2>
<p>[If the notice asked specific questions — capacity, bonding, clearances, ability to meet the schedule — answer each here, numbered to match the notice.]</p>
<hr>
<p><em>This response is submitted for market-research purposes only and does not constitute a proposal or a commitment on the part of either party.</em></p>
<p>Respectfully submitted,<br>${esc(company.contactName) || '[Name]'}<br>${name}</p>`
}

// ─── Cover letter / letter of interest ────────────────────────────────────────
export interface CoverLetterOpts {
  contractTitle: string
  agencyName: string
  solicitationNumber?: string
  officerName?: string
}

export function generateCoverLetter(company: CompanyData, o: CoverLetterOpts): string {
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const certs = [...company.businessTypes, ...company.certifications]
  const status = certs.length ? ` and ${esc(certs.join('/'))} concern` : ''
  const name = esc(company.companyName)
  const agency = esc(o.agencyName)
  const officer = esc(o.officerName) || 'Contracting Officer'

  return `<p>${today}</p>
<p>${esc(o.officerName) || '[Contracting Officer Name]'}<br>${agency}${o.solicitationNumber ? `<br>RE: Solicitation ${esc(o.solicitationNumber)}` : ''}</p>
<p><strong>RE: ${esc(o.contractTitle)}</strong></p>
<p>Dear ${officer}:</p>
<p>${name} is pleased to submit the enclosed response for ${esc(o.contractTitle)}. As a ${esc(company.businessTypes.join(', ')) || 'small'} business${status}, we are fully qualified and eager to support ${agency} on this requirement.</p>
<p>[One short paragraph: why your firm is a strong fit — your directly relevant experience, the specific value you bring, and your understanding of the agency's mission.]</p>
<p>We confirm our firm is registered and active in SAM.gov (UEI ${esc(company.uei) || '[UEI]'}) and holds the certifications and capabilities required to perform. We are committed to delivering on time, on budget, and to the standard ${agency} expects.</p>
<p>Thank you for your consideration. Please direct any questions to me directly.</p>
<p>Respectfully,</p>
<p>${esc(company.contactName) || '[Name]'}<br>${company.contactName ? '' : '[Title]<br>'}${name}<br>${esc(company.contactEmail) || '[Email]'} · ${esc(company.contactPhone) || '[Phone]'}</p>`
}

export function generateCapabilityStatement(company: CompanyData, extras: CapabilityExtras): string {
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const name = esc(company.companyName)

  const naicsItems = company.naicsCodes.length
    ? company.naicsCodes.map(esc)
    : ['[Add NAICS codes to your company profile]']
  const certs = [...company.businessTypes, ...company.certifications]
  const certItems = certs.length ? certs.map(esc) : ['[Add certifications to your company profile]']

  const differentiators = [
    'Direct principal involvement on every engagement',
    'Rapid mobilization and lean, senior-led delivery teams',
    'Full compliance with federal quality and reporting standards',
    ...(company.clearanceLevel ? [`Cleared personnel: ${esc(company.clearanceLevel)}`] : []),
  ]

  const vehicles = (extras.contractVehicles ?? []).length ? (extras.contractVehicles ?? []).map(esc) : null
  const agencies = (extras.agencyHistory ?? []).length ? esc((extras.agencyHistory ?? []).join(', ')) : null
  const overview = extras.capabilityStatement?.trim()
    ? esc(extras.capabilityStatement.trim())
    : `${name} is a ${esc(company.businessTypes.join(', ')) || 'small'} business delivering professional services to federal, state, and local government clients.`

  return `<h1>Capability Statement</h1>
<h2>${name}</h2>
<p>${overview}</p>
<hr>
<h2>Core Competencies</h2>
<p>Aligned to the following NAICS codes:</p>
${li(naicsItems)}
<h2>Differentiators</h2>
${li(differentiators)}
<h2>Certifications &amp; Set-Aside Status</h2>
${li(certItems)}
${vehicles ? `<h2>Contract Vehicles</h2>${li(vehicles)}` : ''}
${extras.pastPerformance?.trim() || agencies ? `<h2>Past Performance</h2><p>${esc(extras.pastPerformance?.trim() ?? '')}${agencies ? `${extras.pastPerformance?.trim() ? '<br>' : ''}Agency experience: ${agencies}` : ''}</p>` : ''}
<hr>
<h2>Company Data</h2>
<p>Company Name: ${name}<br>UEI: ${esc(company.uei) || '[UEI]'}<br>CAGE Code: ${esc(company.cageCode) || '[CAGE]'}${company.yearFounded ? `<br>Year Founded: ${esc(company.yearFounded)}` : ''}${extras.orgSize ? `<br>Organization Size: ${esc(extras.orgSize)}` : ''}${extras.annualRevenue ? `<br>Annual Revenue: ${esc(extras.annualRevenue)}` : ''}<br>Website: ${esc(company.website) || '[Website]'}<br>Point of Contact: ${esc(company.contactName) || '[Name]'}<br>Email: ${esc(company.contactEmail) || '[Email]'}<br>Phone: ${esc(company.contactPhone) || '[Phone]'}</p>
<p><em>Prepared ${today}</em></p>`
}
