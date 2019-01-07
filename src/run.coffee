_ = require('lodash')
fs = require('fs')
git = require('simple-git')
path = require('path')
argv = require('minimist')(process.argv.slice(2))
express = require('express')

argv.repo ?= argv.r
argv.port ?= argv.p
argv.port ?= 3000

app = express()
app.get('/', (req, res) -> res.sendFile(path.join(__dirname + '/../web/index.html')))
app.use('/static', express.static('web'))
app.use('/node_modules', express.static('node_modules'))

app.post('/refresh', _refresh = (req, res, fn) =>
  console.log 'GIT-SD getting branches...'
  repo = git(argv.r)
  repo.branch (b_err, b_data) ->
    remote_branches = _.clone(_.filter(b_data.branches, (v, k) -> k.startsWith 'remotes/origin/'))
    commits = _.uniq(_.pluck(remote_branches, 'commit'))

    return console.error 'GIT-SD found no remote branches on origin' unless commits.length
    console.log "GIT-SD getting commit details for commits: #{commits}"

    repo.show ['-s', '--format=%h;%ae;%cI'].concat(commits), (s_err, s_data) ->
      for line in s_data.split('\n').map((s) -> s.trim()) when line.length
        [commit, email, date] = line.split(';')
        for name, branch of remote_branches when branch.commit is commit
          branch.email = email
          branch.date = date

      result =
        path: argv.repo
        branches: remote_branches

      fs.writeFile 'web/repo.json', JSON.stringify(result), (e) ->
         console.error(e) if e
         console.log("GIT-SD done") unless e

      res?.send(JSON.stringify(result))
      fn?()
)

_refresh(null, null, -> app.listen(argv.port, -> console.log "GIT-SD serving on http://localhost:#{argv.port}/"))