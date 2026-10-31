# love.fútbol: brand research and implementation basis

Research date: 30 October 2026. Scope: the global love.fútbol identity and its current public digital presence. This is a researched Brandkit implementation, not an organization-issued graphic standards manual. The source register is [`../reference/sources.json`](../reference/sources.json).

The [extended site research](SITE-RESEARCH.md) adds cross-page visual evidence, English/Spanish/Brazilian Portuguese contexts, audience routes, project content and source-quality findings. The [application guide](APPLICATION-GUIDE.md) gives explicit local working defaults without changing the status of unverified official standards.

## What is established

**Use the name `love.fútbol` in prose.** The lowercase name, separating dot, and accented `ú` are consistently used by the organization. Its FAQ explains the dot as a point of connection across people, languages, and shared passions. The logo is a hand-drawn pitch containing the custom wordmark, with an asymmetric outline, open goal areas, center line, and a small corner flag. These irregularities are part of the artwork. The founder explicitly connects the logo to the simplicity and imperfect, improvised spaces of grassroots football. Do not replace the mark with typed text, a geometric rectangle, or an invented football icon. ([FAQ](https://www.lovefutbol.org/faq), [About Us](https://www.lovefutbol.org/about-us))

The idea arose during a visit to Morocco in December 2005; the organization identifies 2006 as its founding year. Its historical account describes children playing in a narrow space interrupted by a hazardous canal. The 100th-project microsite identifies Villa Nueva, Guatemala, as the first project in 2006 and Hissey Playground in Philadelphia as the 100th project, inaugurated in November 2025. These are organizational milestones, not demonstrated dates of logo revisions. ([About Us](https://www.lovefutbol.org/about-us), [100 Projects](https://100.lovefutbol.org/))

The brand represents a nonprofit that works with communities to develop, recover, and sustain inclusive sports spaces. Its current material emphasizes local leadership, shared ownership, sustained use, and social connection. Football is a catalyst, but the FAQ explicitly describes multi-use spaces and activities beyond football. Copy should not imply that love.fútbol is a football club, commercial stadium operator, or direct provider of every program run at a project site. ([Governance](https://www.lovefutbol.org/governance-transparency), [FAQ](https://www.lovefutbol.org/faq))

## Voice and useful content structure

The strongest source for communication principles is the organization's [culture document](https://www.lovefutbol.org/hubfs/LF%20Organizational%20Culture.pdf?hsLang=en). It emphasizes clear and accessible communication, authenticity, trust, respect, teamwork, and global connection. For Brandkit starter documents, this supports plain language, active descriptions of what communities do, and captions that credit local participants. This is an editorial interpretation of published organizational principles, not a separately verified tone-of-voice manual.

The short line **“More than a place to play”** is in current official use. It is suitable as an attributed brand line; it should not be treated as compulsory on every layout. Project counts, donation amounts, country totals, and annual impact numbers vary across current pages and historical campaigns. Keep those values in dated document content, with their own sources, rather than freezing them into reusable brand tokens. ([Homepage](https://www.lovefutbol.org/))

The organization's contributed [community-development guide](https://cdn.sanity.io/files/oyf3dba6/production/49cf0f4ff864cb7b66187236d4dd70bef71e32f4.pdf) provides a useful structure for project material: understanding a place, formalizing a project, connecting local participants, building, celebrating, and supporting continued use. A project brief can describe local context, community leadership, the proposed space, responsibilities, and sustainability. An impact report can distinguish activity, access, participation, and longer-term outcomes. These are content recommendations grounded in the methodology, not claims that the resulting Brandkit layouts are official templates.

Photography should show real places and the people shaping them. Official examples include community meetings, collaborative construction, play, completed spaces, and first-person accounts. Obtain suitable publication rights and consent for any photograph used in a final document, especially images of children. The implementation does not treat public photo URLs as a reusable stock-photo library. The [inclusion framework](https://www.lovefutbol.org/hubfs/LF%20Inclusion%20%26%20Equity%20Framework.pdf?hsLang=en) also supports showing a range of community participants and avoiding imagery that reduces the work to one group or one sport.

## Logo source and reproduction

A usable **native vector version** was found in the first page of *Core Principles and Best Practice in Establishing Community-Driven Sport Spaces*. U.S. Soccer's [resource page](https://www.ussoccer.com/soccer-forward/resource-hub/best-practices-for-community-driven-sport-spaces) attributes the resource to love.fútbol and dates the listing 19 September 2025. The linked PDF contains filled paths for the complete white logo and red flag, rather than a raster image in a PDF wrapper. It is the preferred source for scalable artwork in this kit.

Extraction notes: page 1 is 1080 × 1361 PDF points; PyMuPDF drawing indices 50–62 contain the mark; bounds are approximately `(363.599, 36.726)` to `(713.710, 235.759)`. Twelve groups are white and one is the red flag. The flag's encoded RGB equivalent rounds to `#ED1C24`. Preserve the source curves, counters, gaps, and proportions. The supplied vector is white/red; any black or monochrome adaptations must be identified as derived variants, even where comparable treatments are observed in official raster assets. Do not describe an extracted PDF mark as a downloaded original brand-master SVG.

The current website's [full logo](https://www.lovefutbol.org/hubfs/LoveFutbol_January2026/images/logo+love.futbol.webp), its [footer logo](https://www.lovefutbol.org/hubfs/logo+love.futbol.png), and official reports supply visual corroboration. The 2024 and 2025 annual reports were inspected: their logos are embedded raster images, so their PDF container alone does not qualify them as vector masters. A historical [Formby Creative portfolio](https://formbycreative.com/lovefutbol) documents branding, apparel, web, and marketing work, but does not establish an authoritative logo revision chronology or a current standards specification.

No public specification for minimum size, prescribed clear space, partner-logo ratios, approved recolorings, or trademark placement was located. Any spacing used in this kit is a documented practical layout choice. Preserve the complete mark, reserve breathing room, and verify small-size legibility rather than labeling an invented ratio as an official rule.

## Current website palette

The uploaded capture and the live public site support the following digital values. These are **observed website colors**, not Pantone references or a complete organization-approved print palette. Public CSS and page-level styles establish different roles; theme defaults are not necessarily the final computed style of every component.

| Value | Evidence and observed role |
| --- | --- |
| `#489D60` | Navigation active states, blog links, and footer treatment; current child stylesheet and page styles. |
| `#88C59B` | Light green display headings and country-section treatments on the projects page. |
| `#D17F2D` | Terracotta links/theme accent and alternating project-section treatments. |
| `#3CB1EA` | Active cyan headings, metric figures and section fields on the homepage; contact treatment in the About/Partners section. Confirmed beyond a generic theme declaration. |
| `#5A9F6F` | Green in theme button definitions; record separately from the stronger recurring green. |
| `#1D1D1B` | Dark heading/footer-related theme value. |
| `#081913` | Very dark green body-text theme value. |
| `#F5F4EF` | Warm off-white in footer-icon/page treatments. |
| `#FFFFFF` | White backgrounds and reversed artwork. |
| `#ED1C24` | Approximate RGB conversion of the extracted PDF logo flag; a logo detail, not a verified general-purpose UI accent. |

Sources: [projects page](https://www.lovefutbol.org/projects), [current child CSS](https://www.lovefutbol.org/hubfs/hub_generated/template_assets/1/205378236071/1793319989497/template_child.css), and the current theme stylesheet registered in `sources.json`.

For accessible document text, the dark ink works well against the observed green, light-green, terracotta, and off-white backgrounds. Calculated WCAG relative-luminance contrast against white is approximately 3.35:1 for `#489D60`, 3.10:1 for `#D17F2D`, and 2.00:1 for `#88C59B`. They should not automatically become small text on white or backgrounds for small white text. Contrast against `#1D1D1B` is approximately 5.04:1, 5.45:1, and 8.45:1, respectively. These are implementation calculations, not official brand rules.

## Typography: distinguish the evidence layers

**Bahianita** is explicitly used for country display headings on the projects page, appears in the 2025 annual report, and is now documented in inline heading styles on Home, About, Methodology, Governance, Donate and Contact. **Red Hat Text** appears in the current site's font declarations (including the local family alias `Red Hat`) and in the organizational culture PDF. These provide a practical, reproducible pairing for Brandkit starter documents. Bahianita is a display face; Red Hat Text is better suited to long text and small labels. The [cross-page evidence record](../reference/site-visual-evidence.json) preserves the observed declarations and their limits.

The site's child CSS also assigns **DK Brush Crush** to H1 and blog-post titles, and **Acumin Pro Condensed** to H3. Those declarations do not mean every current page uses them: the captured projects page has explicit Bahianita country headings and no H1. The later audit found plain H1 titles on Dharavi and Milpa Alta detail pages matching the brush-font rule without a descendant family override. That is a supported CSS-cascade inference for present content; browser-computed styles and successful commercial font loading were not measured. Record these as observed alternative roles. Do not redistribute commercial font files merely because the site loads them publicly. ([Child CSS](https://www.lovefutbol.org/hubfs/hub_generated/template_assets/1/205378236071/1793319989497/template_child.css), [Acumin publisher](https://fonts.adobe.com/fonts/acumin), [Brush Crush author note](https://www.dafont.com/dk-brush-crush.font))

Bahianita and Red Hat Text are available under the SIL Open Font License from their official source repositories. Keep their license files with any redistributed fonts. Font rights do not confer rights to the love.fútbol name or mark. ([Bahianita source](https://github.com/google/fonts/tree/main/ofl/bahianita), [Red Hat source](https://github.com/RedHatOfficial/RedHatFont))

The reports show why one universal typography claim would be misleading. The [2024 report](https://www.lovefutbol.org/hubfs/%5BReview%20V02%5D%202024%20Annual%20Report.pptx.pdf?hsLang=en) uses prominent magenta/black layouts and embedded Caveat/Poppins text. The [2025 report](https://www.lovefutbol.org/hubfs/2025%20Annual%20Report%20Review%20Version%2001_Copy.pptx-1.pdf?hsLang=en) uses blue/cyan layouts with Bahianita and Avenir, among other embedded fonts. These are publication-specific treatments. The current website's green/terracotta styling is a third context. An asset folder named `LoveFutbol_January2026` is useful provenance, but does not establish the date of an organization-wide rebrand.

## Boundaries and next evidence to obtain

The kit can confidently provide the sourced identity, faithful vector geometry, observed digital colors, documented font roles, and clearly labeled starter templates. It cannot establish official print conversions, Pantone colors, a formal exclusion zone, minimum reproduction dimensions, prescribed partner arrangements, or an approved template family without further organization-issued material.

U.S. Soccer invites users to learn from and adapt contributor resources, but that wording is not a blanket license for the mark, unrelated photographs, or font binaries. Public availability establishes provenance, not unlimited reuse. Keep the organization's artwork attribution and third-party font licenses distinct from Brandkit's own code license. The most useful future additions would be a current brand manual, original approved logo exports, authorized typography guidance, and explicit photography and partner-identity rules.
