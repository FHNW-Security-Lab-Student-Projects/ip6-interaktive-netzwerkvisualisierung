## [1.14.2](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/compare/v1.14.1...v1.14.2) (2026-07-28)

### Refactoring

* cancel in-flight viewport pan when focusing on compound ([de819f2](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/de819f20584d176aa4fa95e42207eaf726e50cc1))
* change node expand zoom behavior ([ed5d9c1](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/ed5d9c1c89578c55fc669bcee2c4684e7ef97750))
* refactor node zoom ([a5bf95b](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/a5bf95bfb8ff1e89a46e0854600042390b437165))
* streamline layout stop handling in expand/collapse logic ([0abb0b8](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/0abb0b81baff0361ed2f6dbfbaca83ca76496337))

## [1.14.1](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/compare/v1.14.0...v1.14.1) (2026-07-28)

### Bug Fixes

* prevent legend button from pushing zoom-fit button under search ([f94f553](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/f94f553cf9450f20b240229a60899d82078fc143))

## [1.14.0](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/compare/v1.13.0...v1.14.0) (2026-07-28)

### Features

* redesign legend to horizontal 3-column layout with accurate node shapes and LAG edge ([43bad1b](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/43bad1ba92b0820612de223b4264dd8792a663ae))

### Bug Fixes

* adjust router icon offset to x:+1 y:-1 ([74c9eaa](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/74c9eaab6b43b4ea7bef1f7cef6b235515e8cfb8))
* adjust router icon offset to x:0 y:-1 ([2363099](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/236309954b5fa67bd37fe31881e10f29d5c0fa0b))
* align all legend swatches in fixed-width column so labels line up ([8bd4f2a](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/8bd4f2af359eb63cadd1d07759df88a24748234e))
* compound legend colors match netmap and router icon centering ([2d5869c](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/2d5869cb19cf22d47be16f11538a588be67c59b2))
* correct node swatch proportions and add Group/compound to legend ([fc9493c](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/fc9493cbf5a8a05df4cef1ac332c467beabfba4a))
* flat-top router hexagon and add Compounds column to legend ([dd1e639](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/dd1e6393071f1750c9598ad4239203e246e91a5f))
* legend compound shapes, opaque fill, larger router icon, right-anchor positioning ([17d2256](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/17d225687e1ef08e2dca3341253adb23a9fd1339))
* move Compounds column next to Node Types, center Host/Unknown icons ([2a8560f](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/2a8560f3e7b9ea2329ddbf3f2dfd313cbbb57550))

### Refactoring

* extract Legend into its own component ([182f9fc](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/182f9fcde773387426f23f036c3276393765e869))

## [1.13.0](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/compare/v1.12.0...v1.13.0) (2026-07-28)

### Features

* add all layout demos ([3d5f02e](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/3d5f02e5177a7fd8e1310fc0090b75ed23fc8a51))

### Refactoring

* improve edge demos ([610a0a0](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/610a0a00e7a0fa6129c95ea71966f0c44090bbb5))

## [1.12.0](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/compare/v1.11.0...v1.12.0) (2026-07-28)

### Features

* add new edge visualizations ([62cfd18](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/62cfd18b3ef0ac7acf69bbd2ece043c1f668c14d))

## [1.11.0](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/compare/v1.10.0...v1.11.0) (2026-07-27)

### Features

* implement new locate device button ([fd285ec](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/fd285ecbf128bfdd38cfe07b39f805bd6ba3384a)), closes [ip6-26bb_netviz/netviz-docs#32](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz-docs/issues/32)

## [1.10.0](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/compare/v1.9.0...v1.10.0) (2026-07-27)

### Features

* legend in toolbar ([bccc7d5](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/bccc7d5d8fc7c678c419ea286f80c2c0a0cda782))

## [1.9.0](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/compare/v1.8.0...v1.9.0) (2026-07-27)

### Features

* feat selection color ([f5088ec](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/f5088ecd2bee22901c4115a9a7ad23c5bad771bd))

## [1.8.0](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/compare/v1.7.0...v1.8.0) (2026-07-26)

### Features

* add dependency-cruiser configuration ([3887d5f](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/3887d5f2dfbeae29f04d3d800afd7deab22fcc34))

## [1.7.0](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/compare/v1.6.1...v1.7.0) (2026-07-01)

### Features

* add group context menu ([4202872](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/4202872edfe15e0525c3f2cdb33d84fa135bc992)), closes [ip6-26bb_netviz/netviz-docs#20](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz-docs/issues/20)
* add initial stp context menu and edge implementation ([c5816b8](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/c5816b868b3091a257293b970492262c7313da10))
* add mismatch rule for routed port subnets ([c9480b2](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/c9480b2154d630aa2b6bc53d321779a1eee901dc))
* add node/device type to context menu neighbors accordion, sorted by interface name ([5af2fc2](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/5af2fc2c27bc7bc1ab72d9426671116a3171ce1e))
* add separator between vlan interface pairs on edge context menu ([f8efed9](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/f8efed9019c06b7cabeefdb209e3678dcbf7d076))
* add tooltips and zoom-to-fit to toolbar ([c03f841](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/c03f841732f68eeb29f19ddfe05682aaacda74f5))
* add visual resize indicator to context menu ([09a308e](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/09a308ec13e7ae377786b703fb8ec2d47aad8816))
* added title image ([d03ffef](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/d03ffef74b239093bd15ec6b14199e4cae411343))
* align accordion tables ([401679e](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/401679e55dfe86523a4fc186d8b4f4b041259979))
* apply expand/collapse all to all selected compound nodes ([7a0b0c6](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/7a0b0c6f92121596bb36628bb0c4efc248bd9f33))
* collapse all clears savedExpanded so sub-compounds stay collapsed on re-expand ([54f90b8](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/54f90b841aeb743620eab996659a549e083fbc40))
* deleted chevron and added icons ([483b1f5](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/483b1f5fce492fadd3dc168f7a54e1369b46aaff))
* demo on edge warning states ([eceb7b3](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/eceb7b37124af472b2949de6dce730085272461a))
* demo triangle ([5b8473a](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/5b8473a22f8b7e0ec4db7c6f1ef47298b9f5d6c8))
* derive main link state based on interface pairs ([9e69d91](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/9e69d91ec0fb87107716949df6cd7e9ff03eae5e))
* draft ([30e48ba](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/30e48baec3b48d37a6228d45146444cd5b4d8add))
* draft 2 ([c38bf64](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/c38bf640227e7aeb5cef481447454f84d281ed9e))
* enhance detail panel to support host data and add host panel component ([b041be7](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/b041be7537cc021b468c3824411cf56b363f8e51))
* enhance node type resolution for detail and edge panels ([0e8398a](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/0e8398aa2c6619bffbe7d223e6a2cff744dbd018))
* first draft main page ([da83810](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/da83810fe051a664d3befcf5739f7ee291bc7e63))
* implement different edge styles ([5a672e0](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/5a672e03ee0d79cbff063138a2de19d06aa91aa5))
* implement more context via hover on context menu elements ([d3b532b](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/d3b532bd025259fb173c1bb752a7ad7c361cd9d2)), closes [ip6-26bb_netviz/netviz-docs#27](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz-docs/issues/27)
* improve and align context menu for nodes and edges ([c48c634](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/c48c634cef92eec178b892d13c6184712eed1db3))
* introduce DetailPanel component and refactor NodeDetailPanel usage ([bb2de24](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/bb2de248aa3e385f7101b9c3f7de8570462002b9))
* normalize api values ([0cb98b9](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/0cb98b958e606a84fae45bca7610f139d4deec19))
* preserve approximate scroll position in context menu ([7e8717c](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/7e8717c3633f587ede29021f0299e147d04873d9))
* preserve edge thickness and color on edge select ([4159ec0](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/4159ec012b0b402019a1502d98676a4c0174fb99)), closes [ip6-26bb_netviz/netviz-docs#22](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz-docs/issues/22)
* reduced image size ([b421d1b](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/b421d1b3130debd8749732d7a7de5a2b4f458fe5))
* right-click context menu with recursive expand/collapse on compound nodes ([bec30dc](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/bec30dc556041b32bbb28528452be4d85e4ee0c4))
* show connected nodes in ports accordion ([ba01906](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/ba019060d7fb3553fe5e52d6de0130bc153817e7))
* show same context menu for expanded / collapsed non-group compound nodes ([cee6b3e](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/cee6b3e276867b231cb528c2872548feb4aa0117))

### Bug Fixes

* always use full interface name ([a5754c9](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/a5754c99467447e7b2ada60e209912011ef62804))
* consistent styling for toolbar icons ([01c5372](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/01c53720e47ef789c20353ef24198372b76ebedf))
* demo triangle ([cef64fc](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/cef64fcce0df3af7a9ee4b41ad0a6b59bb739007))
* do not apply stp styling to edges if stp protocol/instance hasn't explicitly been selected ([028a6fb](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/028a6fbf9ae00c346fa97f445b6ef6069c05339c))
* do not poll api for custom devices and show appropriate message in context menu ([de0465c](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/de0465ca31772ae953f77fcf0863e121b5e4a827))
* host icons included ([c647134](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/c647134ed820dce829cbf5d7821b23ab694acfaf))
* icon align ([fc6a74e](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/fc6a74e8a0b3d5849cd92315668d18c8de0bd737))
* main page ([c2f7ae0](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/c2f7ae0c334743101c2c0ca94c281c28507a78bf))
* main page ([dcce013](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/dcce013944d9e4c0a1dc3f9fff5dc65d1dfc7358))
* pipeline ([2bc20ef](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/2bc20ef8261bfb851b9fd6882f09a90aecfac477))
* prevent context menu from reappearing on stp instance change ([42064b7](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/42064b72786afa0821f8e0bb6193d7151720ecf8))
* properly render mac address ([3e9b916](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/3e9b9164cc89fbba7a8a44fc7e1ebe965c22e82c))
* router scaling ([b02d7f8](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/b02d7f82842477bd30e769c9ed2664104e0b858c))
* stop mousedown propagation so ctx-menu buttons actually fire ([faa20c3](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/faa20c302f37f71c9ee2d853c33e6d41705b8abf))
* toolbar layout ([d1759e6](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/d1759e656badf99ed13cb02257dc67ec665b5788))
* unselect node or edge when context menu is closed via button ([b4ba8a6](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/b4ba8a641a8b9b5f27f52bca77841450ce31a625))
* use hardware serial ([4ca2987](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/4ca2987a41d769605082113acff95282cba08969))
* warning rules for edges ([69cf0b6](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/69cf0b66fadd6d0db6aac5d771e8dcc446342397))

### Documentation

* add right-click context menu design spec ([861d76e](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/861d76e7bee39dda17e632c371d270f917e881a5))

### Refactoring

* cleanup stp implementation ([7b32bb0](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/7b32bb0bdb3f1f9f1bcf464d6ce024c95a3f0290))
* extract warning rules to own file and add new ones ([93ab347](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/93ab3475d42af6483df7dd4ddb2bcf18af25f57c))
* implement double-click to expand/collapse nodes instead of right-click ([bd7fdd1](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/bd7fdd156284a291ccf94c309aeaf7b9be435b81))
* improve node spacing to reduce overlaps ([6165514](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/61655145f6373c705f0878965b7ceca7e0f9ebfc))
* improve warning display in context menu ([074f907](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/074f9075ae6543c0513f22058f3e682808382d34))
* reduce overlapping compounds ([4a71746](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/4a717463ea27106ece271a2bbf96ca1d8a511d10))
* remove fixture script and integrate custom graph loader for visualizations ([8a7374d](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/8a7374df0ef78ea146c34f5f22349474d3f7f9bc))
* standardize textual types ([e92bbed](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/e92bbeddc963de778f061da302d0b819be67a4ec))
* style and rearrange the app toolbar ([2349c43](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/2349c439633d6e400c4f7799829e77a962e1218b)), closes [ip6-26bb_netviz/netviz-docs#15](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz-docs/issues/15)

### Reverts

* remove design spec doc ([bb879ca](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/bb879ca49d3c4fa03f9fb6774b67ea54042278b4))

## [1.6.1](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/compare/v1.6.0...v1.6.1) (2026-06-18)

### Bug Fixes

* enable texture on viewport for improved rendering performance ([9d97fa8](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/9d97fa8e6d006fe472b3bc346fd506d4350554b3))
* handle zooming for multiple os and input devices ([4c3e840](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/4c3e8404678534161f5f4b7f4800b04b35c0ed30))

## [1.6.0](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/compare/v1.5.0...v1.6.0) (2026-06-17)

### Features

* add compound graph visualizations for routers and switches ([e16fa76](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/e16fa7615f4eeaa7823209ca5b068aa386187193))

## [1.5.0](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/compare/v1.4.0...v1.5.0) (2026-06-15)

### Features

* add initial toolbar with recursive expand/collapse support ([d67508e](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/d67508e6e5fee7cca25246d7d4402e3ce8e8f7ba))
* implement search functionality in toolbar with dropdown support ([888e30d](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/888e30dc86c8b89024302a07925515a9ffe02c1e))

## [1.4.0](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/compare/v1.3.0...v1.4.0) (2026-06-15)

### Features

* enhance NodeDetailPanel and header to support additional context parameters ([aa8154e](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/aa8154ec9887da77d07369e02b2ae94bac112532))
* enhance sibling compound separation and animation in expand/collapse layout ([c3c2109](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/c3c2109e975073ad39e4c27b2cfc15f90c871998))
* implement sibling compound separation in expand/collapse layout ([4f32180](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/4f3218083429f78c7763500b910bfdd70b2894eb))
* integrate devices endpoint and add context menu ([c817e6d](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/c817e6d9265ff91b14e88a4844b380999f681774))

### Bug Fixes

* lock outer nodes during layout execution ([0533010](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/0533010d99ba87ae4af841619066ff3402d0eff6))

### Refactoring

* extract panel setup to improve composition ([3da0718](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/3da071840a34c119270b639e01a829b74f192520))
* float back button right ([9eb8b82](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/9eb8b829d0d09ad9daf9d4165d61b3c935c436c7))
* move title bar to bottom of stage ([32a50fe](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/32a50fe4dba3d05c1ce4f977b0c25da5acd0be1e))

## [1.3.0](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/compare/v1.2.0...v1.3.0) (2026-06-14)

### Features

* add build review stage to ci pipeline ([3d98ed6](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/3d98ed6622cda2f0ac6e86172906b7e7c1bbeb19))
* add different layout providers ([c0432e6](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/c0432e6b05496c9a3144b504a052e82bcd8f7c4d))
* add example visualizations ([6914fcf](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/6914fcf7ecddf330abba195c20ee7abd2bc3f092))
* add fixture to fetch and transform live api data ([acc2fd2](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/acc2fd2ef31fea4e493ee311965ce0172f81e42b))
* add graph element styles ([e93f866](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/e93f866ac75621770a605a6694daa0b8c41d6b46))
* add iconify icons ([7e60b3a](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/7e60b3a6866794fa2920869dfb623e16a9786d99))
* add type declarations for cytoscape extensions ([f642750](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/f642750f27880096cca1661c29e5d8a6b01724a9))
* enhance expand/collapse functionality with position capturing and layout management ([7f9f1e4](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/7f9f1e4ad16ed66a213a4838e90a623a0aefc088))
* implement expand/collapse functionality for compound nodes and add layout utilities ([3013a63](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/3013a63776b3fe71131e65ff541761af1a82de7e))

### Documentation

* update installation instructions to use pnpm instead of npm ([1f2cecd](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/1f2cecdceeb31317fe33718916c3bb47fbcebfab))

### Refactoring

* improve handling of compound nodes and edges ([65ffe46](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/65ffe4641215b0f61089e999e16f18e647a2b23e))
* update examples to use new styles and helpers ([2104951](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/21049513045376d5ae2c2ce628c696c53c545cff))

### Build System

* migrate from npm to pnpm due to security concerns ([7f71938](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/7f7193846417493b604ce51e6e625a8602b40453))

## [1.2.0](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/compare/v1.1.1...v1.2.0) (2026-05-08)

### Features

* add back button to viz stage ([8c761bb](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/8c761bbe6005e4ed2ae4c9f0226390f0ee2083ab))
* add graph models and helpers ([fca91b3](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/fca91b35889dee332637021c0a017c939a996d19))
* add hierarchical visualization examples ([186c1b5](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/186c1b5c5d0e865f2a402434e5deaaa52156f86e))

## [1.1.1](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/compare/v1.1.0...v1.1.1) (2026-03-05)

### Documentation

* add notes to basegraph structure ([8da2b22](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/8da2b22e76bcf4efb6117998ab73f4cba52739a9))

### Chores

* update gitignore ([1e5c417](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/1e5c417ab9c8178aed849dbb474088b7b23ab8f8))

## [1.1.0](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/compare/v1.0.2...v1.1.0) (2026-03-04)

### Features

* add viz title and description ([1b8720f](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/1b8720faaacd81d4e6a7b3e28f158fb02e1762bb))

### Documentation

* add pages deployment demo to readme ([f291af4](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/f291af47852ca7c7f74f6923ea8b092888c7960c))

## [1.0.2](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/compare/v1.0.1...v1.0.2) (2026-03-04)

### Refactoring

* update server path ([da175c0](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/da175c0afe48c68145b38789d28775d23a3a2da3))

## [1.0.1](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/compare/v1.0.0...v1.0.1) (2026-03-04)

### Refactoring

* use proper modules with spa ([0782fce](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/0782fcef01e733cf1b262922eced6c36ea0c3ad8))

### Chores

* update example env ([6259db6](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/6259db625732f5d5afe71ebe2325f5595741d77a))

## 1.0.0 (2026-03-04)

### Features

* add husky hooks ([9af1d37](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/9af1d37604255ed87f1bdde4946bfac664aac985))
* add logo ([ba8bf2c](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/ba8bf2c3e98c613639684f16e86f8385d2b49b0a))
* add release config ([126747f](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/126747f57d757899f03184a961f3e9de44f2abe4))

### Bug Fixes

* client auth loop ([081e467](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/081e46760d8579b03376e21b90a3355c9731e836))
* ignore generated files from eslint config ([1bae3a9](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/1bae3a9815422c1c976090b4c53a7ccd8edd916d))

### Documentation

* update readme ([2650ce9](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/2650ce92713e1a91c6b72240d8526713d3785f15))

### Refactoring

* use typescript with generated client ([89ce631](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/89ce63194b183a07fb42725f9dd6ac5ff8ea2dbb))

### Chores

* fix deps ([d830898](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/d830898cb0d07e44a8816880897f7faf1a9ea086))
* update deps ([6d0cbe5](https://gitlab.fhnw.ch/ip6-26bb_netviz/netviz/commit/6d0cbe53047fe0b5100097043336b0cb3e8407e1))
