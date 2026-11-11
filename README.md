# Vitruvius — The City of the Ten Books

**A spatial edition of *De Architectura* by PhD Poturak Semir**

The oldest surviving treatise on architecture, rebuilt as a city you can enter in the browser. Each of the 729 passages of Vitruvius has one place in the city, and every building is shaped by the rule that describes it.

## What is in it

- **The text.** All ten books in the English of M. H. Morgan (Harvard University Press, 1914), with the page of that edition for every passage and a link to the page scan, beside the Latin of F. Krohn (Teubner, 1912).
- **The city as data.** 261 buildings and machines hold the 729 passages. The same city can be arranged four ways: by theme, by book, by kind of statement, and by thread (an idea that crosses the books).
- **The city as design.** 55 kinds of form are generated in the browser from 132 rules, each quoted word for word with its address in the text. Walls, wind-turned streets and the forum follow Books I and V.
- **Three ways of seeing.** A model from the air, a walk at eye height, and a true ground plan with a scale in Roman feet.
- **One column in full.** Book III, chapter 5: an Ionic column in which 78 phrases of the text are bound to the parts they define.
- **The sun of Book IX.** Light and shadow for the latitude of Rome, by hour and season.

## What is interpretation

Vitruvius gives proportions, not sizes, so the size of each plot follows the length of its text. Small things (machines, wall samples) are enlarged and the panel says by how much. Passages that describe no object (arguments, stories, prefaces) are housed in exedrae, colonnades and libraries, and are marked as such. Where the text gives no number, the value chosen is marked in the rule.

## Privacy and footprint

- No external requests: a strict Content-Security-Policy allows only files from this site.
- No cookies, analytics, trackers, web fonts or CDNs. No textures or model files: geometry, stone and sky are computed.
- Static files only; runs on GitHub Pages or any local HTTP server. Add `?lite` to the address to switch off ambient occlusion on weak graphics hardware.

### Local preview

```bash
python3 -m http.server 8080
```

## Sources and licence

Morgan's translation (1914) and Krohn's Latin (1912) are in the public domain. Code is under the MIT licence; see `LICENSE`. Three.js is © its authors, MIT.

## Citation

> Poturak, Semir, PhD (2026). *Vitruvius — The City of the Ten Books: a spatial edition of De Architectura.*
