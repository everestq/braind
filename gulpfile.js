const { src, dest, parallel, series, watch } = require('gulp')
const sass = require('gulp-sass')
const notify = require('gulp-notify')
const autoPrefixer = require('gulp-autoprefixer')
const rename = require('gulp-rename')
const cleanCSS = require('gulp-clean-css')
const sourcemaps = require('gulp-sourcemaps')
const browserSync = require('browser-sync').create()
const svgSprite = require('gulp-svg-sprite')
const ttf2woff = require('gulp-ttf2woff')
const ttf2woff2 = require('gulp-ttf2woff2')
const fs = require('fs')
const del = require('del')
const webpack = require('webpack')
const webpackStream = require('webpack-stream')
const uglify = require('gulp-uglify-es').default
const tiny = require('gulp-tinypng-compress')
const gutil = require('gulp-util')
const ftp = require('vinyl-ftp')
const plumber = require("gulp-plumber")
const pug = require('gulp-pug')

const srcPath = 'src/'
const distPath = 'docs/'
const cb = () => { }

function html(cb) {
  return src(srcPath + "pug/pages/*.pug")
    .pipe(plumber())
    .pipe(pug({
      pretty: true
    }))
    .pipe(dest(distPath))
    .pipe(browserSync.reload({ stream: true }));

  cb();
}

const fonts = () => {
  src('./src/fonts/**.ttf')
    .pipe(ttf2woff())
    .pipe(dest('./docs/fonts/'))
  return src('./src/fonts/**.ttf')
    .pipe(ttf2woff2())
    .pipe(dest('./docs/fonts/'))
}

const srcFonts = './src/scss/_fonts.scss'
const appFonts = './docs/fonts/'

const fontsStyle = done => {
  let file_content = fs.readFileSync(srcFonts)

  fs.writeFile(srcFonts, '', cb)
  fs.readdir(appFonts, function (err, items) {
    if (items) {
      let c_fontname
      for (var i = 0; i < items.length; i++) {
        let fontname = items[i].split('.')
        fontname = fontname[0]
        if (c_fontname != fontname) {
          fs.appendFile(srcFonts, `@include font-face("${fontname}", "${fontname}", 400);\r\n`, cb)
        }
        c_fontname = fontname
      }
    }
  })

  done()
}

const svgSprites = () => {
  return src('./src/images/svg/**.svg')
    .pipe(svgSprite({
      mode: {
        stack: {
          sprite: '../sprite.svg'
        }
      }
    }))
    .pipe(dest('./docs/images'))
}

const styles = () => {
  return src('./src/scss/**/*.scss')
    .pipe(sourcemaps.init())
    .pipe(sass({
      outputStyle: 'expanded'
    }).on('error', notify.onError()))
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(autoPrefixer({
      overrideBrowserslist: ["last 5 versions"],
      cascade: false
    }))
    .pipe(cleanCSS({
      level: 2
    }))
    .pipe(sourcemaps.write('.'))
    .pipe(dest('./docs/css/'))
    .pipe(browserSync.stream())
}

const imgToApp = () => {
  src([
    './src/images/favicon/**.*'
  ])
    .pipe(dest('./docs/images/favicon'))
  src([
    './src/images/icon/**.*'
  ])
    .pipe(dest('./docs/images/icon'))
  return src([
    './src/images/**/*.jpg',
    './src/images/**/*.jpeg',
    './src/images/**/*.png',
    './src/images/*.svg'
  ])
    .pipe(dest('./docs/images/'))
}

const resources = () => {
  return src('./src/resources/**')
    .pipe(dest('./docs'))
}

const clean = () => {
  return del(['docs/*'])
}

const scripts = () => {
  return src('./src/js/main.js')
    .pipe(webpackStream({
      output: {
        filename: 'main.js'
      },
      module: {
        rules: [
          {
            test: /\.m?js$/,
            exclude: /node_modules/,
            use: {
              loader: 'babel-loader',
              options: {
                presets: [
                  ['@babel/preset-env', { targets: "defaults" }]
                ]
              }
            }
          }
        ]
      }
    }))
    .pipe(sourcemaps.init())
    .pipe(uglify().on('error', notify.onError()))
    .pipe(sourcemaps.write('.'))
    .pipe(dest('./docs/js'))
    .pipe(browserSync.stream())
}

const watchFiles = () => {
  browserSync.init({
    server: {
      baseDir: './docs'
    }
  })

  watch('./src/scss/**/*.scss', styles)
  watch('./src/index.html', html)
  watch('./src/pug/**/*.pug', html)
  watch('./src/images/**/*.jpg', imgToApp)
  watch('./src/images/**/*.jpeg', imgToApp)
  watch('./src/images/**/*.png', imgToApp)
  watch('./src/images/icon/*.**', imgToApp)
  watch('./src/images/svg/**.svg', svgSprites)
  watch('./src/resources/**', resources)
  watch('./src/fonts/**.ttf', fonts)
  watch('./src/fonts/**.ttf', fontsStyle)
  watch('./src/js/**/*.js', scripts)
}

exports.styles = styles
exports.watchFiles = watchFiles
exports.fontsStyle = fontsStyle

exports.default = series(clean, parallel(html, scripts, fonts, resources, imgToApp, svgSprites), styles, watchFiles)

const tinypng = () => {
  return src([
    './src/images/**/*.jpg',
    './src/images/**/*.jpeg',
    './src/images/**/*.png'
  ])
    .pipe(tiny({
      key: 'MZ0VLML320QYtWXh6vFqY05mtTzNGrmb',
      log: true
    }))
    .pipe(dest('./docs/images/'))
}

const stylesBuild = () => {
  return src('./src/scss/**/*.scss')
    .pipe(sass({
      outputStyle: 'expanded'
    }).on('error', notify.onError()))
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(autoPrefixer({
      overrideBrowserslist: ["last 5 versions"],
      cascade: false
    }))
    .pipe(cleanCSS({
      level: 2
    }))
    .pipe(dest('./docs/css/'))
}

const scriptsBuild = () => {
  return src('./src/js/main.js')
    .pipe(webpackStream({
      output: {
        filename: 'main.js'
      },
      module: {
        rules: [
          {
            test: /\.m?js$/,
            exclude: /node_modules/,
            use: {
              loader: 'babel-loader',
              options: {
                presets: [
                  ['@babel/preset-env', { targets: "defaults" }]
                ]
              }
            }
          }
        ]
      }
    }))
    .pipe(uglify().on('error', notify.onError()))
    .pipe(dest('./docs/js'))
}

exports.build = series(clean, parallel(html, scriptsBuild, fonts, resources, imgToApp, svgSprites), stylesBuild, tinypng)

const deploy = () => {
  let connect = ftp.create({
    host: '',
    user: '',
    password: '',
    parallel: 10,
    log: gutil.log
  })

  let globs = [
    'docs/**',
  ]

  return src(globs, {
    base: './docs',
    buffer: false
  })
    .pipe(connect.newer(''))
    .pipe(connect.dest('/public_html/'))
}

exports.deploy = deploy
exports.img = tinypng
