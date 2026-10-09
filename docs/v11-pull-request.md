# Integrate v1.1 materials and publish the bilingual product site

The repository previously contained the early site while the temporary server ran r17. This branch preserves repository history, imports the r17 baseline, and adds the approved v1.1 material and page updates. Withdrawn process imagery is excluded from the imported baseline.

The catalog now includes 4S, 5S, 6S, Grayscale Space, BANDA 8 and BANDA 9. Eleven corresponding English pages share product facts, routes and inquiry identifiers with Chinese pages. Navigation and footer use light backgrounds with the official logo in its original colors. Product photography, full-ratio technical diagrams, project construction images, company information and contacts have been updated from supplied materials. The 4S installation video loads only on manual playback.

The release retains no-text carousel controls, keyboard/touch viewing, reduced-motion behavior, local inquiry downloads and three unlisted legacy component URLs. Public assets exclude prices, source spreadsheets, authorizations, complete reports and withdrawn process images. Six-S interior imagery remains absent because matching source material was not supplied.

Validation: 48 unit tests; lint and type checks; 33 generated pages; 352 image references; 192 core responsive checks; 88 English layout checks; 58 accessibility scenarios across the core, English and material suites, with zero violations. Additional cover, carousel, material and supplement regressions passed. Automated Edge checks include simulated landscape and 200% equivalent viewports; they do not constitute real-device certification.

Deployment is limited to the existing temporary HTTP preview on port 8080 with noindex. The previous r17 release and container are retained for rollback. This PR must not be automatically merged.
