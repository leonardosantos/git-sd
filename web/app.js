angular
.module('git-sd', [])
.factory('$config', ['$http', ($http) => {
  var config = { $promise: $http.get('/config.json').then((result) => _.extend(config, result.data)) }
  return config
}])
.controller('IndexCtrl', ['$scope', '$http', '$config', ($scope, $http, $config) => {
  receive = (result) => handle($scope.repo = result.data)
  $scope.refresh = () => $scope.loading = $http.post('/refresh').then(receive).then(()=>delete $scope.loading)
  $config.$promise.then(() => $http.get('/repo.json').then(receive))

  handle = (repo) => {
    repo.envs = {}
    envPrefix = $config.envPrefix
    for (b in repo.branches) {
      branch = repo.branches[b]
      if (!branch.name.startsWith(envPrefix)) continue
      envName = branch.name.replace(envPrefix, '')
      repo.envs[envName] = { current: branch }
    }

    deployPrefix = $config.deployPrefix
    for (b in repo.branches) {
      branch = repo.branches[b]
      if (!branch.name.startsWith(deployPrefix)) continue
      envName = branch.name.replace(deployPrefix, '')
      repo.envs[envName] = repo.envs[envName] || {}
      repo.envs[envName].deploy = branch
    }
  }
}])
