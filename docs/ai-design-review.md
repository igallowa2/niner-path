# Niner Path - AI Design Review

## 1. Project Overview

Niner Path is an academic and career planning application designed for UNC Charlotte students. It brings degree progress, course planning, job tracking, and campus involvement into one platform.

The feature implemented during Sprint 1 is the Job Tracker. It allows students to add job applications, view their applications, update application statuses, and access saved information.

The project uses React 19, TypeScript, Vite, and Vitest. The team has also introduced a SQLite database layer using Prisma during Sprint 2.

## 2. AI Tools Used During Development

The team used AI tools to assist with planning, design, and implementation.

### GitHub Copilot (VS Code) and Figma MCP Server

- Used the Figma MCP Server to read the Job Tracker frame from the team's Figma design.
- Used GitHub Copilot to suggest components, layouts, and an implementation plan.
- Helped translate the design reference into a development plan.

### Claude

- Assisted with drafting GitHub Issues based on the team's user stories.
- Suggested starter code for the Job Tracker.
- Suggested tests to help verify the implemented functionality.

These tools supported the development process but did not replace the team's responsibility for reviewing and testing the application.

## 3. Benefits of Using AI

AI tools provided several benefits during development:

- **Faster planning:** AI suggestions helped turn user stories and design references into actionable development tasks.
- **Development assistance:** Starter code suggestions helped the team begin implementing components.
- **Testing support:** Suggested tests helped the team consider different application behaviors and validation scenarios.
- **Improved organization:** AI assistance helped draft GitHub Issues and organize development work.

## 4. Risks and Limitations

Although AI tools were useful, their suggestions may contain errors or may not fully match the team's requirements.

Potential risks include:

- Generated code may not follow the team's existing architecture.
- Suggested tests may overlook important edge cases.
- Design suggestions may not perfectly match the Figma prototype.
- AI-generated documentation or issues may contain inaccurate information.
- Developers may become overly dependent on generated suggestions without understanding the code.

AI-generated content should therefore be treated as a starting point rather than an automatically correct solution.

## 5. Human Review and Validation

The team reviewed AI-generated suggestions before incorporating them into the project.

The team's responsibilities included:

- Reviewing generated code and modifying it to match the design and acceptance criteria.
- Running automated tests using Vitest.
- Performing manual testing against the acceptance checklist.
- Fixing problems discovered during testing, including a form layout overflow on narrow screens.
- Ensuring that team members understand how the implemented feature works.

The current test suite includes 21 passing tests across three test files.

## 6. Privacy and Security Considerations

AI tools should not receive sensitive project information unnecessarily.

The team should avoid sharing:

- Database passwords and credentials.
- Private API keys and authentication tokens.
- Personal student information.
- Other confidential information.

The project's local environment configuration should remain private and should not be committed to GitHub.

## 7. Recommendations for Future Development

The team should continue using AI tools as development assistants while maintaining human oversight.

Recommended practices include:

1. Review AI-generated code before merging it into the main branch.
2. Verify generated tests against the project's actual acceptance criteria.
3. Avoid submitting sensitive information to AI tools.
4. Keep documentation consistent with the actual implementation.
5. Ensure every team member can explain the code they contribute.
6. Continue running automated and manual tests after changes.

## 8. Conclusion

AI tools helped the Niner Path team with design interpretation, project planning, starter code, and testing suggestions.

However, the team remained responsible for reviewing, modifying, and validating the work before incorporating it into the project.

The goal is to use AI to improve development efficiency while maintaining code quality, security, and accountability.

## 9. AI Usage Disclosure

The team used GitHub Copilot with the Figma MCP Server to interpret the Job Tracker design and suggest components, layouts, and an implementation plan.

Claude was used to assist with drafting GitHub Issues from user stories and suggesting starter code and tests.

All AI-generated suggestions were reviewed by the team. The team modified suggestions to meet its design and acceptance criteria, ran tests, performed manual checks, and fixed identified issues.
