var _ = require('lodash')
var q = require('q')
var fs = require('fs')
var git = require('simple-git')
var path = require('path')
var argv = require('minimist')(process.argv.slice(2))
var express = require('express')

argv.repo = argv.repo || argv.r || process.cwd()
argv.config = argv.config || argv.c || './git-sd.json'

var app = null
var repo = null
var config = {}
var result = { path: argv.repo }

function loadConfig(){
  var default_config = JSON.parse(fs.readFileSync(path.join(__dirname + '/default-config.json')))
  try {
    config = JSON.parse(fs.readFileSync(argv.config))
    console.log('GIT-SD using "' + argv.config + '" config file')
  } catch (e) {
    console.log('GIT-SD using default config')
  } finally {
    config = _.defaultsDeep(config, default_config, {
      port: argv.port || argv.p,
      address: argv.address || argv.a,
    })
  }
}

function setupServer() {
  app = express()
  app.get('/', (req, res) => res.sendFile(path.join(__dirname + '/../web/index.html')))
  app.use('/static', express.static(path.join(__dirname + '/../web')))
  app.use('/node_modules', express.static(path.join(__dirname + '/../node_modules')))

  app.get('/repo.json', (req, res) => res.send(JSON.stringify(result)))
  app.get('/config.json', (req, res) => res.send(JSON.stringify(config)))

  app.post('/refresh', refreshRepoData)
  return app
}

function startServer() {
  refreshRepoData(null, null, () => app.listen(config.port, () => console.log("GIT-SD serving on http://"+config.address+":"+config.port+"/")))
}

function refreshRepoData(req, res, fn) {
  console.log('GIT-SD getting remote and branches...')
  var d = {
    remote: q.defer(),
    branch: q.defer()
  }

  repo = git(argv.repo)
  repo.listRemote(['--get-url'], (r_err, r_data) => d.remote.resolve(result.remote = r_data.trim()))
  repo.branch((b_err, b_data) => {
    var remote_branches = _.clone(_.filter(b_data.branches, (v, k) => k.startsWith(config.remoteBranchPrefix)))
    var commits = _.uniq(_.pluck(remote_branches, 'commit'))

    if (!commits.length) return console.error('GIT-SD found no remote branches on origin')
    console.log("GIT-SD getting commit details for commits: " + commits.join(', '))

    repo.show(['-s', '--format=%h;%ae;%cI'].concat(commits), (s_err, s_data) => {
      var lines = s_data.split('\n').map((s) => s.trim())
      for(var l in lines) {
        var line = lines[l]
        if (!line.length) continue
        var [commit, email, date] = line.split(';')
        for (var name in remote_branches) {
          var branch = remote_branches[name]
          if (branch.commit != commit) continue
          branch.email = email
          branch.date = date
        }
      }

       d.branch.resolve(result.branches = remote_branches)
    })
  })

  q.all(_(d).values().pluck('promise').value()).then(() => {
    if (res) res.send(JSON.stringify(result))
    if (fn) fn()
  })
}

function printHelp(){
  console.log([
    'usage: git-sd [options]',
    '',
    'options:',
    '  -r --repo     Repository local path to use [./]',
    '  -p --port     Port to use [3000]',
    '  -a --address  Address to use [0.0.0.0]',
    '  -c --config   Config file path to use [./git-sd.json]',
    '  -h --help     Print this list and exit.'
  ].join('\n'));
  process.exit();
}

if (argv.help || argv.h) printHelp()
else setupServer(startServer(loadConfig()))

