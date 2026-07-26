/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [],
  options: {
    doNotFollow: {
      path: ['node_modules', 'src/generated'],
    },
    includeOnly: {
      path: ['^src/'],
    },
    reporterOptions: {
      dot: {
        theme: {
          graph: {
            rankdir: 'LR',
            splines: 'spline',
            nodesep: '0.5',
            ranksep: '2.0',
          },
          modules: [
            {
              criteria: { source: '^src/visualizations/' },
              attributes: { fillcolor: '#dae8fc', style: 'filled', color: '#6c8ebf' },
            },
            {
              criteria: { source: '^src/components/' },
              attributes: { fillcolor: '#d5e8d4', style: 'filled', color: '#82b366' },
            },
            {
              criteria: { source: '^src/layout-providers/' },
              attributes: { fillcolor: '#ffe6cc', style: 'filled', color: '#d6b656' },
            },
          ],
        },
      },
    },
  },
};
