angular
.module('git-sd', [])
.controller('IndexCtrl', ['$scope', '$http', ($scope, $http) => {
  receive = (result) => handle($scope.repo = result.data)
  $scope.refresh = () => $scope.loading = $http.post('/refresh').then(receive).then(()=>delete $scope.loading)
  $http.get('/static/repo.json').then(receive)

  handle = (repo) => {
    repo.envs = {}
    envPrefix = 'remotes/origin/envs/'
    for (b in repo.branches) {
      branch = repo.branches[b]
      if (!branch.name.startsWith(envPrefix)) continue
      envName = branch.name.replace(envPrefix, '')
      repo.envs[envName] = { current: branch }
    }

    deployPrefix = 'remotes/origin/deploy/'
    for (b in repo.branches) {
      branch = repo.branches[b]
      if (!branch.name.startsWith(deployPrefix)) continue
      envName = branch.name.replace(deployPrefix, '')
      repo.envs[envName] = repo.envs[envName] || {}
      repo.envs[envName].deploy = branch
    }
  }
}])
