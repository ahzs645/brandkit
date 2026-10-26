# UNBC identity and document applications

This kit preserves the official full UNBC logo and records the published identity rules. It adds editable department/subdepartment document metadata, 22 native templates, ten Word stationery/report starters, a four-layout PowerPoint presentation, an HTML email signature, shared research report/decision brief/brand portfolio publications in Letter and A4, and nine guide pages.

Use **Documents** for flowing report content, tables, figures and maintained Word masters. Use **Templates** for stationery, slide and social layouts. **Brand portfolio** documents distinguish the university, units, initiatives and independent organizations. The existing SPARK Lab and Over the Edge identities are linked with explicit relationship notes.

## Naming and logo rules

**Departments** sets a unit's sub-logo: the full logo with the unit's name under it in Helvetica Neue 95 Black, built as UNBC's own sub-logos and the door signs are, from the same UNBC logo package. Pick one of 88 units or type a name; the kit also includes every listed unit's sub-logo in green, black and white. The department and subdepartment fields carry the same names into documents as ordinary text.

The full logo is at least 38.1 mm wide. Keep its proportions and the B/N top difference clear on every side. Green appears on white; black is for black-only reproduction on white/light ground; white is preferably on UNBC Green. Gold is an accent only. No tiny favicons, separated lettermark, crest patterns or arbitrary logo colours are generated.

## Editable outputs and source files

- Letter and A4: letterhead, continuation, memorandum, research report, decision brief, brand portfolio.
- Presentations: cover, section, content and evidence layouts.
- Digital: social announcement and HTML email signature.
- Original university templates are retained separately in `official-templates/`.
- Official resources, hashes and source discrepancies: `reference/`.
- All new page layouts are local applications; original university template files remain unchanged.

Artwork, previews and PDFs are set in Helvetica Neue LT Pro. Word and PowerPoint request Arial, the university’s documented alternative, because the font’s licence does not allow embedding in editable files.

Rebuild the definition and guides with `npm run make:unbc`, then `npm run make:documentation`.
