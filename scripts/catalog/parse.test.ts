// Tests the catalog page reader with small copies of real catalog page layouts (no network needed).
import { describe, expect, it } from 'vitest'
import { parseCourseLine, parseCoursePage, parseProgramList, parseProgramPage, parseRule, programType } from './parse.js'

const page = (body: string) => new DOMParser().parseFromString(`<html><body>${body}</body></html>`, 'text/html')

const course = (text: string, coid: number) =>
  `<li class="acalog-course"><span><a href="#" onclick="showCourse('42', '${coid}',this, 'x'); return false;">${text}</a></span></li>`

// Same structure as "Computer Science, Web/Mobile Development and Software Engineering Concentration, B.S."
const programHtml = `
<td class="block_content">
<h1 id="acalog-content">Computer Science, Web/Mobile Development and Software Engineering Concentration, B.S.</h1>
<div class="acalog-core"><h2>Admission Requirements</h2><ul><li>Minimum GPA: 2.5</li></ul></div>
<div class="acalog-core"><h2>Degree Requirements</h2><hr></div>
<div class="acalog-core"><h3>Major Courses (53 credit hours)</h3><hr></div>
<div class="acalog-core"><h4>Core Courses (29 credit hours)</h4><ul>
  ${course('ITSC 1212 - Introduction to Computer Science I (4)', 147954)}
  ${course('ITSC 1600 - Computing Professionals (2)', 147957)}
  <li class="acalog-adhoc acalog-adhoc-after"></li>
  ${course('or ITSC 2600 - Computer Science Program, Identity, Career (2)', 149369)}
  ${course('ITSC 3155 - Software Engineering (3)', 147974)}
</ul></div>
<div class="acalog-core"><h4>Capstone Course (3 credit hours)</h4><p>Select one of the following:</p><ul>
  ${course('ITSC 4155 - Software Development Projects (3)', 1)}
  ${course('ITCS 4232 - Game Design and Development Studio (3)', 2)}
</ul></div>
<div class="acalog-core"><h4>Elective Concentration Courses (9 credit hours)</h4><p>Select three courses from the lists below.</p></div>
<div class="acalog-core"><h5>Software Design Courses</h5><ul>${course('ITIS 3130 - Introduction to Human-Centered Computing (3)', 3)}</ul></div>
<div class="acalog-core"><h4>Technical Elective Concentration Courses (6 credit hours)</h4><p>Select two elective courses from the 3000- or 4000-levels of courses offered by the College of Computing and Informatics.</p></div>
<div class="acalog-core"><h3>Empty Heading</h3></div>
<div class="acalog-core"><h2>Degree Total = 120 Credit Hours</h2></div>
<div class="acalog-core"><h2>Progression Requirements</h2><p>GPA of 2.0 or above.</p></div>
</td>`

describe('catalog page reader', () => {
  it('reads a program page into nested requirement groups', () => {
    const p = parseProgramPage(page(programHtml))
    expect(p.name).toMatch(/^Computer Science, Web\/Mobile/)
    expect(p.type).toBe('Major')
    expect(p.degree).toBe('B.S.')
    expect(p.totalCredits).toBe(120)

    const labels = p.groups.map((g) => g.label)
    expect(labels).not.toContain('Admission Requirements')
    expect(labels).not.toContain('Progression Requirements')
    expect(labels).not.toContain('Empty Heading')

    const core = p.groups.find((g) => g.label === 'Core Courses')!
    expect(core.minCredits).toBe(29)
    expect(core.rule).toBe('ALL')
    expect(core.courses.map((c) => [c.code, c.slot])).toEqual([
      ['ITSC 1212', 1],
      ['ITSC 1600', 2],
      ['ITSC 2600', 2], // "or" = same slot as ITSC 1600
      ['ITSC 3155', 3],
    ])
    expect(core.courses[0].catalogId).toBe(147954)
    expect(p.groups[core.parentIndex!].label).toBe('Major Courses')

    const capstone = p.groups.find((g) => g.label === 'Capstone Course')!
    expect(capstone).toMatchObject({ rule: 'CHOOSE', chooseCount: 1 })

    const electives = p.groups.find((g) => g.label === 'Elective Concentration Courses')!
    const design = p.groups.find((g) => g.label === 'Software Design Courses')!
    expect(electives).toMatchObject({ rule: 'CHOOSE', chooseCount: 3 })
    expect(p.groups[design.parentIndex!]).toBe(electives)

    const technical = p.groups.find((g) => g.label === 'Technical Elective Concentration Courses')!
    expect(technical.rule).toBe('OPEN') // no course list, just instructions
  })

  it('reads course lines, including "or" alternatives and notes', () => {
    expect(parseCourseLine('MATH 1241 - Calculus I (3) (fulfills Quantitative/Data requirement)')).toMatchObject({
      code: 'MATH 1241',
      title: 'Calculus I',
      minCredits: 3,
      note: 'fulfills Quantitative/Data requirement',
      isAlternative: false,
    })
    expect(parseCourseLine('or MATH 2165 - Introduction to Discrete Structures (3)')?.isAlternative).toBe(true)
    expect(parseCourseLine('ECON 4890 - Directed Research (1-3)')).toMatchObject({ minCredits: 1, maxCredits: 3 })
  })

  it('understands "select" rules', () => {
    expect(parseRule('Select one of the following:')).toMatchObject({ rule: 'CHOOSE', chooseCount: 1 })
    expect(parseRule('Select 15 elective credit hours.')).toMatchObject({ rule: 'CHOOSE', chooseCredits: 15 })
    expect(parseRule('')).toMatchObject({ rule: 'ALL' })
  })

  it('labels program types from the name', () => {
    expect(programType('Economics, Minor')).toBe('Minor')
    expect(programType('Finance, Finance Concentration, B.S.B.A.')).toBe('Major')
    expect(programType('Economics, M.S., Early Entry')).toBe('Early Entry')
    expect(programType('Game Design and Development, Undergraduate Certificate')).toBe('Certificate')
  })

  it('reads the program list without duplicates', () => {
    const doc = page(`
      <a href="preview_program.php?catoid=42&poid=12771">Economics, Business Concentration, B.S.</a>
      <a href="preview_program.php?catoid=42&poid=12771">Economics, Business Concentration, B.S.</a>
      <a href="content.php?catoid=42&navoid=5403">Academic Programs</a>`)
    expect(parseProgramList(doc)).toEqual([{ catalogId: 12771, name: 'Economics, Business Concentration, B.S.' }])
  })

  it('reads a course page', () => {
    const doc = page(`<td class="block_content"><h1>ITSC 3155 - Software Engineering</h1>
      An introduction to software engineering.<br><br><strong>Credit Hours:</strong> (3)<br>
      <strong>Restriction(s):</strong> College of Computing and Informatics major or minor<br>
      <strong>Prerequisite(s):</strong> ITSC 2214 with grade of C or above<br><br>
      <a href="#">Schedule of Classes</a></td>`)
    expect(parseCoursePage(doc)).toMatchObject({
      code: 'ITSC 3155',
      title: 'Software Engineering',
      description: 'An introduction to software engineering.',
      minCredits: 3,
      restrictions: 'College of Computing and Informatics major or minor',
      prerequisites: 'ITSC 2214 with grade of C or above',
    })
  })
})
