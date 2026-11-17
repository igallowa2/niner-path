/**
 * Keyword → skill map used to tag catalog courses from their descriptions.
 * Edit freely: add keywords, add skills, or change names. Matching is case-insensitive and
 * whole-word (so "SQL" won't match inside another word; "statistic" matches "statistical").
 *
 * `onet` is the matching O*NET element (https://www.onetonline.org), so course skills can line
 * up with job skills: type is O*NET's category (Skills, Knowledge, or Technology Skills).
 */
export interface SkillDefinition {
  /** Short name shown in the app. */
  name: string
  onet: { type: 'Skill' | 'Knowledge' | 'Technology'; element: string }
  /** Words or phrases that suggest the course builds this skill. A trailing * matches word endings. */
  keywords: string[]
}

export const SKILL_KEYWORDS: SkillDefinition[] = [
  {
    name: 'Economic Analysis',
    onet: { type: 'Knowledge', element: 'Economics and Accounting' },
    keywords: ['economic*', 'microeconomic*', 'macroeconomic*', 'supply and demand', 'market structure*', 'monetary', 'fiscal', 'inflation', 'international trade', 'labor market*'],
  },
  {
    name: 'Statistics',
    onet: { type: 'Knowledge', element: 'Mathematics' },
    keywords: ['statistic*', 'regression', 'probability', 'hypothesis test*', 'sampling', 'inference', 'econometric*', 'variance'],
  },
  {
    name: 'Mathematics',
    onet: { type: 'Skill', element: 'Mathematics' },
    keywords: ['calculus', 'algebra', 'mathematical', 'optimization', 'derivative*', 'quantitative method*'],
  },
  {
    name: 'Data Analysis',
    onet: { type: 'Technology', element: 'Analytical or scientific software' },
    keywords: ['data analysis', 'analytics', 'data set*', 'dataset*', 'forecasting', 'empirical', 'quantitative analysis'],
  },
  {
    name: 'Spreadsheets',
    onet: { type: 'Technology', element: 'Spreadsheet software' },
    keywords: ['excel', 'spreadsheet*'],
  },
  {
    name: 'Databases',
    onet: { type: 'Technology', element: 'Database management system software' },
    keywords: ['sql', 'database*', 'data management'],
  },
  {
    name: 'Programming',
    onet: { type: 'Skill', element: 'Programming' },
    keywords: ['programming', 'python', 'coding', 'software development'],
  },
  {
    name: 'Accounting',
    onet: { type: 'Knowledge', element: 'Economics and Accounting' },
    keywords: ['accounting', 'financial statement*', 'auditing', 'taxation', 'bookkeeping', 'cost accounting'],
  },
  {
    name: 'Finance',
    onet: { type: 'Knowledge', element: 'Economics and Accounting' },
    keywords: ['finance', 'financial', 'investment*', 'valuation', 'capital budgeting', 'interest rate*', 'banking', 'portfolio*'],
  },
  {
    name: 'Marketing',
    onet: { type: 'Knowledge', element: 'Sales and Marketing' },
    keywords: ['marketing', 'consumer behavior', 'advertising', 'branding', 'sales'],
  },
  {
    name: 'Management',
    onet: { type: 'Knowledge', element: 'Administration and Management' },
    keywords: ['management', 'organizational', 'leadership', 'strategic planning', 'business strategy'],
  },
  {
    name: 'Operations',
    onet: { type: 'Skill', element: 'Operations Analysis' },
    keywords: ['operations', 'supply chain', 'logistics', 'process improvement', 'production planning'],
  },
  {
    name: 'Business Law',
    onet: { type: 'Knowledge', element: 'Law and Government' },
    keywords: ['law', 'legal', 'regulation*', 'contract*', 'public policy'],
  },
  {
    name: 'Information Systems',
    onet: { type: 'Knowledge', element: 'Computers and Electronics' },
    keywords: ['information system*', 'information technology', 'digital technolog*'],
  },
  {
    name: 'Critical Thinking',
    onet: { type: 'Skill', element: 'Critical Thinking' },
    keywords: ['critical thinking', 'case analysis', 'case stud*', 'research method*', 'evaluate', 'policy analysis'],
  },
  {
    name: 'Decision Making',
    onet: { type: 'Skill', element: 'Judgment and Decision Making' },
    keywords: ['decision making', 'decision-making', 'game theory', 'risk analysis'],
  },
  {
    name: 'Writing',
    onet: { type: 'Skill', element: 'Writing' },
    keywords: ['writing', 'written', 'research paper*', 'report writing'],
  },
  {
    name: 'Communication',
    onet: { type: 'Skill', element: 'Speaking' },
    keywords: ['presentation*', 'oral communication', 'communication skill*', 'public speaking'],
  },
]
