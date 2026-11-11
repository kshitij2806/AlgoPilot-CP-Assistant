const webpack = require('webpack');
const config = require('./webpack.config.js');

console.log('⚡ Building extension bundles...');
const compiler = webpack(config);

compiler.run((err, stats) => {
  if (err) {
    console.error('Fatal webpack error:', err);
    process.exit(1);
  }
  
  if (stats.hasErrors()) {
    console.error('Compilation failed with errors:');
    console.error(stats.toString({ colors: false }));
    process.exit(1);
  }

  console.log(stats.toString({
    chunks: false,
    colors: false,
    modules: false,
    assets: true
  }));
  console.log('\n✅ CP Assistant extension built successfully in dist/');

  compiler.close((closeErr) => {
    if (closeErr) console.error('Close error:', closeErr);
    process.exit(0);
  });
});
