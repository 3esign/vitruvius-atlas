# Vitruvius — The City of the Ten Books

**An Interactive 3D Spatial & Bilingual Edition of Marcus Vitruvius Pollio's *De Architectura* (Books I–X)**  
**Conceived and Authored by PhD Poturak Semir**

---

## Overview

*Vitruvius — The City of the Ten Books* transforms all ten books of *De Architectura* into a navigable, rule-governed Roman city in 3D WebGL. Every one of the **729 passages** of Vitruvius sits at a unique architectural address inside the walled city and is coupled directly to:

1. **Exact Physical Page References** in Morris Hicky Morgan's canonical English edition (*Vitruvius: The Ten Books on Architecture*, Harvard University Press, 1914, **pp. 3–319**), including inline `[p. N]` page-turn folio markers and direct page-scan links.
2. **Complete Original Latin (*De Architectura Libri Decem*)** from F. Krohn's Teubner edition (1912), switchable live between **English (`EN`)**, **Original Latin (`LAT`)**, and **Parallel Bilingual (`EN+LAT`)** views.
3. **261 Parametric 3D Monuments Across 55 Architectural Typologies**, synthesized directly in the browser from **132 verbatim proportional and geometric rules** stated by Vitruvius—with zero external 3D asset files and zero texture downloads.
4. **Book III.5 Interactive Ionic Column Plate**, binding **78 phrases and 44 measure sentences** directly to elevation, profile, and shaft-section stone geometry.

---

## Spatial & Scholarly Architecture

- **Four Reconfigurable Urban Matrices (`?by=...`)**:
  - **Theme** — 11 architectural precincts (*The Architect, Principles, Nature, Materials, Construction, The City, The Temple, The House, Water, The Heavens & Time, Machines*) arranged around a `3 : 2` Roman Forum (`V.1.2`) with streets turned `22.5°` off the winds (`I.6.12`).
  - **Ten Books** — 10 wedges for Books I–X, sorted in chapter order from Forum to rampart.
  - **Statement Kind** — 9 districts grouping rules, procedures, explanations, descriptions, stories, arguments, definitions, prefaces, and catalogues.
  - **Density of Measure** — concentric rings placing Vitruvius's densest quantitative chapters around the Forum.
- **Three Vitruvian Spatial Camera Modes (`I.2.2`)**:
  - **3D Maquette (*Scaenographia*)** — damped aerial architectural model with collision-free monument callouts.
  - **Walk Street (*Ambulatio*, FPS)** — eye-level (`1.70 m`) first-person walk (`WASD` + mouse look) with distances measured in Roman *pedes* (`1 pes = 0.296 m`).
  - **Plan Blueprint (*Ichnographia*)** — true orthographic architectural plan with a live **Roman *pedes* & metres** scale bar.
- **Environmental & Astronomical Fidelity**:
  - **24-Wind Vitruvian Compass Rose (`I.6.4–13`)** engraved around the city walls (*Septentrio, Aquilo, Solanus, Eurus, Auster, Africus, Favonius, Caurus*, etc.) with `22.5°` street-orientation rays.
  - **Cardinal Precinct Exposures**: West-facing temple approaches (`IV.5.1`), East-facing libraries (`VI.4.1`), North-facing shipyards (`V.12.7`), and Southwest-facing winter baths (`V.10.1`).
  - **Roman Solar Analemma (`IX.7`, latitude `41.9° N`)**: live equinoctial and solstitial solar altitude/azimuth lighting reporting the `8 : 9` gnomon shadow ratio in Rome.
  - **Surrounding Roman Campagna**: topographic contour lines (*isohypses*), exterior *opus arcuatum* aqueduct arcade (`VIII.6`), and Tyrrhenian harbor breakwaters with Pharos lighthouse (`V.12`).
  - **Pythagorean Harmonic Soundscape (`V.4`)**: optional `0 KB` WebAudio synthesis tuned to Vitruvian fourths (`4:3`), fifths (`3:2`), and octaves (`2:1`).

---

## Privacy & Zero-Dependency Footprint

- **Zero external runtime requests** enforced via strict Content-Security-Policy (`default-src 'none'; connect-src 'self'`).
- **Zero cookies, analytics, trackers, or third-party fonts/CDNs**.
- Runs directly on static hosting (GitHub Pages or any local HTTP server).

### Local Preview

```bash
npx serve .
# or Python:
python3 -m http.server 8080
```

---

## Citation

> **Poturak, Semir, PhD (2026).** *Vitruvius — The City of the Ten Books: An Interactive 3D Spatial & Bilingual Edition of De Architectura.*
