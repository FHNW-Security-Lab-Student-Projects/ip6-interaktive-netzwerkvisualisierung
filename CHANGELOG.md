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
