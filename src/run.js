_ = require('lodash')
fs = require('fs')
git = require('simple-git')
path = require('path')
argv = require('minimist')(process.argv.slice(2))
express = require('express')

argv.repo = argv.repo || argv.r
argv.port = argv.port || argv.p
argv.port = argv.port || 3000

app = express()
app.get('/', (req, res) => res.sendFile(path.join(__dirname + '/../web/index.html')))
app.use('/static', express.static(path.join(__dirname + '/web')))
app.use('/node_modules', express.static(path.join(__dirname + '/node_modules')))

app.post('/refresh', _refresh = (req, res, fn) => {
  console.log('GIT-SD getting branches...')
  repo = git(argv.r)
  repo.branch((b_err, b_data) => {
    remote_branches = _.clone(_.filter(b_data.branches, (v, k) => k.startsWith('remotes/origin/')))
    commits = _.uniq(_.pluck(remote_branches, 'commit'))

    if (!commits.length) return console.error('GIT-SD found no remote branches on origin')
    console.log("GIT-SD getting commit details for commits: " + commits.join(', '))

    repo.show(['-s', '--format=%h;%ae;%cI'].concat(commits), (s_err, s_data) => {
      lines = s_data.split('\n').map((s) => s.trim())
      for(l in lines) {
        line = lines[l]
        if (!line.length) continue
        [commit, email, date] = line.split(';')
        for (name in remote_branches) {
          branch = remote_branches[name]
          if (branch.commit != commit) continue
          branch.email = email
          branch.date = date
        }
      }

      result = {
        path: argv.repo,
        branches: remote_branches
      }

      fs.writeFile(path.join(__dirname + '/web/repo.json'), JSON.stringify(result), (e) => e ? console.error(e) : console.log("GIT-SD done"))

      if (res) res.send(JSON.stringify(result))
      if (fn) fn()
    })
  })
})

_refresh(null, null, () => app.listen(argv.port, () => console.log("GIT-SD serving on http://localhost:"+argv.port+"/")))