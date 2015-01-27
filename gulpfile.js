/*------------------------------------------------------------------------------
 * 1. DEPENDENCIES
------------------------------------------------------------------------------*/
var gulp = require('gulp'),
  $ = require('gulp-load-plugins')({
    pattern: ['gulp-*', 'gulp.*'],
    replaceString: /\bgulp[\-.]/
  }),
  browserSync = require('browser-sync'),
  del = require('del'),
  mainBowerFiles = require('main-bower-files'),
  saveLicense = require('uglify-save-license')
;

/*------------------------------------------------------------------------------
 * 2. FILE DESTINATIONS (RELATIVE TO ASSSETS FOLDER)
------------------------------------------------------------------------------*/
var bsOpt = {
  'browser':    "google chrome canary"
, 'port':       3000
, 'proxy':      'wordpress.dev'
, 'proxy':      false
, 'tunnel':     'randomstring23232'  // Subdomains must be between 4 and 20 alphanumeric characters.
, 'tunnel':     false
};
var paths = {
  'dest':       './'
, 'prodDest':   '../build'
// html
, 'htmlFiles':  'src/html/*.html'
, 'htmlDest':   'src/html'
// images
, 'imgDir':     'src/images'
, 'imgDest':    'shared/images'
// jade
, 'jadeFiles':  ['src/jade/*.jade', 'src/jade/**/*.jade']
, 'jadeDir':    'src/jade/*.jade'
// JavaScript
, 'jsDir':      'src/js'
, 'jsFiles':    'src/js/**/*.js'
, 'jsDest':     'shared/js'
// others
, 'phpFiles':   ['*.php', './**/*.php']
// scss
, 'scssFiles':  ['src/scss/**/*.scss', 'src/scss/**/*.sass']
, 'scssDir':    'src/scss'
// css
, 'cssFiles':  'bower_components/tmp/css/*.css'
, 'cssDest':   'shared/css'
};

/*------------------------------------------------------------------------------
 * 3. initialize browser-sync && bower_components
------------------------------------------------------------------------------*/
gulp.task('bower-init', function() {
  var $_filterCss = $.filter('**/src/scss/module/*.*');
  gulp.src(mainBowerFiles(), {base: './bower_components'})
    .pipe($.bowerNormalize())
    .pipe($_filterCss)
    .pipe($.rename({ prefix: '_m-', extname: '.scss' }))
    .pipe($_filterCss.restore())
    .pipe(gulp.dest(paths.dest));
});

gulp.task('bower-clean', function() {
  del('bower_components/');
});

gulp.task('foundation-init', function() {
  var bfDir = 'bower_components/foundation/scss';
  gulp.src([bfDir + '/foundation.scss', bfDir + '/normalize.scss'])
    .pipe($.rename({ prefix: '_' }))
    .pipe(gulp.dest(paths.scssDir + '/core'))
  gulp.src(bfDir + '/**/_*.scss')
    .pipe(gulp.dest(paths.scssDir + '/core'));
});

gulp.task('browser-sync', function() {
  var args = {};
  args.browser = bsOpt.browser;
  args.open = true;
  if (bsOpt.proxy == false) {
    args.server = { baseDir: paths.dest };
    args.startPath = paths.htmlDest;
  } else {
    args.proxy = bsOpt.proxy;
    args.open = 'external';
  }
  if (bsOpt.tunnel != false) {
    args.tunnel = bsOpt.tunnel;
  }
  // end opts
  browserSync(args);
});

gulp.task('bs-reload', function() {
  browserSync.reload()
});

/*------------------------------------------------------------------------------
 * 4. Jade Tasks
------------------------------------------------------------------------------*/
gulp.task('jade', function() {
  return gulp.src(paths.jadeDir)
    .pipe($.data(function(file) {
      return require('./setting.json');
    }))
    // .pipe($.changed(paths.htmlDest, { extension: '.html' }))
    .pipe($.plumber())
    .pipe($.jade({ pretty: true }))
    .pipe(gulp.dest(paths.htmlDest))
    .pipe(browserSync.reload({ stream: true }));
});

/*------------------------------------------------------------------------------
 * 5. js Tasks
------------------------------------------------------------------------------*/
gulp.task('jsApp', function() {
  return gulp.src(paths.jsDir + '/app/*.js')
    .pipe($.sourcemaps.init())
    .pipe($.concat('script.js'))
    .pipe($.uglify())
    .pipe($.rename({ suffix: '.min' }))
    .pipe(gulp.dest(paths.jsDest))
    .pipe($.sourcemaps.write())
    .pipe($.rename({ suffix: '.dev' }))
    .pipe(gulp.dest(paths.jsDest))
    .pipe(browserSync.reload({ stream: true }));
});

gulp.task('jsLib', function() {
  return gulp.src(paths.jsDir + '/lib/*.js')
    .pipe($.concat('lib.js'))
    .pipe($.uglify({
      preserveComments: saveLicense
    }))
    .pipe($.rename({ suffix: '.min' }))
    .pipe(gulp.dest(paths.jsDest))
    .pipe(browserSync.reload({ stream: true }));
});

gulp.task('jsTasks', [
  'jsApp',
  'jsLib'
]);

/*------------------------------------------------------------------------------
 * 6. sass Tasks
------------------------------------------------------------------------------*/
gulp.task('scss', function() {
  return gulp.src(paths.scssFiles)
    .pipe($.plumber({ errorHandler: handleError }))
    .pipe($.rubySass({
      r: 'sass-globbing',
      'sourcemap=none': true
      // sourcemap: none // #113 "Try updating to master. A fix for this went in but I won't be releasing anything until 1.0."
    }))
    .pipe($.filter('*.css'))
    .pipe($.pleeease({
      autoprefixer: {
        browsers: ['last 2 versions']
      },
      sourcemaps: true
    }))
    .pipe($.filter('*.css').restore())
    .pipe(gulp.dest(paths.cssDest))
    .pipe(browserSync.reload({ stream: true }));
});

function handleError(err) {
  console.log(err.toString());
  this.emit('end');
}

/*------------------------------------------------------------------------------
 * 7. Image file tasks
------------------------------------------------------------------------------*/
gulp.task('image-min', function() {
  return gulp.src(paths.imgDest)
    .pipe($.changed(paths.imgDest))
    .pipe($.imagemin({ optimizationLevel: 3 }))
    .pipe(gulp.dest(paths.imgDest))
    .pipe(browserSync.reload({ stream: true }));
});

gulp.task('sprite-sprite', function () {
  var args = {
    mode: "sprite",
    cssFile: "css/sprite.css",
    svg: {
      sprite: "svg/sprite.svg"
    },
    svgPath: "/assets/svg/sprite.svg",
    preview: {
      sprite: "sprite.html"
    }
  }
  var $_filter = $.filter('**/*.css');
  return gulp.src('src/svg/sprite/*.svg')
    .pipe($.svgSprites(args))
    .pipe(gulp.dest('assets'))
    .pipe($_filter)
    .pipe($.flatten())
    .pipe($.rename({ prefix: '_m-', extname: '.scss' }))
    .pipe(gulp.dest('src/scss/module'))
    .pipe($_filter.restore());
});

gulp.task('sprite-symbols', function () {
  var args = {
    mode: "symbols"
  }
  return gulp.src('src/svg/sprite/*.svg')
    .pipe($.svgSprites(args))
    .pipe(gulp.dest('assets'));
});

gulp.task('sprite-defs', function () {
  var args = {
    mode: "defs"
  }
  return gulp.src('src/svg/sprite/*.svg')
    .pipe($.svgSprites(args))
    .pipe(gulp.dest('assets'));
});

/*------------------------------------------------------------------------------
 * 8. gulp Tasks
------------------------------------------------------------------------------*/
gulp.task('watch', function() {
  gulp.watch([paths.jadeFiles], ['jade']);
  gulp.watch([paths.jsFiles], ['jsTasks']);
  gulp.watch([paths.scssFiles], ['scss']);
  gulp.watch([paths.imgDest + '/sprite/*.png'], ['sprite']);
  gulp.watch([paths.phpFiles], ['bs-reload']);
});

gulp.task('default', [
  'browser-sync',
  'scss',
  'jade',
  'jsTasks',
  'sprite',
  'watch'
]);

gulp.task('init', [
  'bower-init',
  'foundation-init'
]);
