'use strict';

var pod = crosscloud.connect();



function semiBareURL(messyURL) {
	var bare = messyURL.toLowerCase();
	if (bare.indexOf("://") !== -1) {
		bare = bare.substring(bare.indexOf("://") + 3);
	}
	return bare;
}
function bareURL(messyURL) {
	var bare = semiBareURL(messyURL);
	if (bare.indexOf("/") !== -1) {
		bare = bare.substring(0,bare.indexOf("/"));
	}
	return bare;
}

var rostrumApp = angular.module('rostrumApp', [
  'ngRoute',
  'rostrumControllers'
]);

rostrumApp.config(['$routeProvider',
  function($routeProvider) {
  	//console.log("ROUTE!");
    $routeProvider.
      when('/', {
        templateUrl: 'templates/home.html',
        controller: 'HomeCtrl'
      }).
      when('/user/:userURL', {
        templateUrl: 'templates/user.html',
        controller: 'UserCtrl'
      }).
      when('/forum/:forumURL', {
        templateUrl: 'templates/forum.html',
        controller: 'ForumCtrl'
      }).
      when('/thread/:authorURL/:threadID', {
        templateUrl: 'templates/thread.html',
        controller: 'ThreadCtrl'
      }).
      otherwise({
        redirectTo: '/'
      }
    );
  }
]);


/*
angular.module('myApp', [
  'ngRoute',
  'myApp.view1',
  'myApp.view2',
  'myApp.version'
]).
config(['$routeProvider', function($routeProvider) {
  $routeProvider.otherwise({redirectTo: '/view1'});
}]);

*/