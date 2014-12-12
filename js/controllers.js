var rostrumControllers = angular.module('rostrumControllers', []);

rostrumControllers.controller('HomeCtrl', ['$scope',/* '$http',*/
  function ($scope/*, $http*/) {
    /*$http.get('phones/phones.json').success(function(data) {
      $scope.phones = data;
    });*/

	//$scope.home || ($scope.home = {});

	$scope.semiBareURL = semiBareURL;

	pod.onLogin(function(){
		pod.query().filter( {
	    	type: "subscription",
	    	_owner: pod.getUserId() 
	    }).onAllResults(function(subscriptions){
	    	if (subscriptions.length) {
		    	$scope.$apply(function(){
		    		$scope.subscriptions = subscriptions;
		    		updateFeed();
		    	});
		    }
	    }).start();
	});

	var feedMap = {};

	function updateFeed() {
		for (var i=0; i<$scope.subscriptions.length; i++) {
			var subscription = $scope.subscriptions[i];
			pod.query().filter( {
		    	type: "post",
		    	is_root: true,
		    	forum: subscription.forum
		    }).onAllResults(function(posts){
		    	for (var j=0; j<posts.length; j++) {
		    		var post = posts[j];
		    		feedMap[post._id] = post;
		    	}
		    	var feed = [];
		    	for (var id in feedMap) {
		    		feed.push(feedMap[id]);
		    	}
		    	$scope.$apply(function(){
		    		$scope.feed = feed;
		    	});
		    }).start();
		}
	}


	$scope.addSubscription = function() {
		var newSubscription = prompt("New forum URL:");
		newSubscription = bareURL(newSubscription);
		if (newSubscription) {
			pod.push({type:"subscription", forum:newSubscription}, function(){
				console.log("SUCCESSFULLY SUBSCRIBED");
			});
		}
	}



    /*$scope.feed = [
    	{
    		title: "What is the meaning of life?",
    		author: "alice.databox1.com",
    		forum: "philosophy.databox1.com"
    	},
    	{
    		title: "Hello world",
    		author: "carol.databox1.com",
    		forum: "testing.databox1.com"
    	}
    ];*/
  }
]);


function submitPost() {
	var title = $("#myThreadTitle").val();
	var text = $("#myThreadText").val();
	if (!title) {
		alert("Title must not be blank");
	} else {
		addThread(currentForumURL, title, text); //TODO: Global abatement
	}
}

rostrumControllers.controller('ForumCtrl', ['$scope', '$route',
  function ($scope, $route) {
    /*$http.get('phones/phones.json').success(function(data) {
      $scope.phones = data;
    });*/

	//console.log("SCOPE!", $scope);
	//console.log("FORUM!", $route);

	$scope.route = $route;

	$scope.semiBareURL = semiBareURL;

	//$scope.forum || ($scope.forum = {});

    /*$scope.feed = [
    	{
    		title: "What is the meaning of life?",
    		author: "alice.databox1.com",
    		forum: "philosophy.databox1.com"
    	},
    	{
    		title: "What are some good books to read?",
    		author: "bob.databox1.com",
    		forum: "philosophy.databox1.com"
    	}
    ];*/

    $scope.feed = [];

    pod.onLogin( function(){
    	console.log("QUERY!");
    	var rootsCount = 0;
    	pod.query().filter( {
	    	type: "post",
	    	is_root: true,
	    	forum: $route.current.params.forumURL
	    } ).onAllResults(function(roots) {
	    	if (roots.length !== rootsCount) {
				console.log("GOT ROOTS!", roots);
				rootsCount = roots.length;
	    		$scope.$apply(function(){
	    			$scope.feed = roots;
	    		});
	    	}
	    	
	    }).start();

    });
    
    console.log("asdf!")
    

    $scope.submitPost = function() {
		var title = $("#myThreadTitle").val();
		var text = $("#myThreadText").val();
		if (!title) {
			alert("Title must not be blank");
		} else {
			var post = {
				author: bareURL(pod.getUserId()),
				title: title,
				text: text,
				parent: null,
				is_root: true,
				forum: $route.current.params.forumURL,
				type: "post"
			}
			console.log("PUSHING POST:", post);
			pod.push(post, function(result){
				console.log("SUCCESSFULLY PUSHED!");
				result.thread_id = result._id;
				pod.push(result, function(){
					//window.location.reload();
					$("#myThreadTitle").val("");
					$("#myThreadText").val("");
				})
				//Add the ID as the thread_id
				//window.location.reload();
			});
		}
	}

  }]
);


rostrumControllers.controller('ThreadCtrl', ['$scope', '$route',
  function ($scope, $route) {
    
    var idMap = {};
    var rootPost;
    $scope.treeRoot;

    function updateTree() {
    	for (var postID in idMap) {
			idMap[postID].children = [];
		}
		for (var postID in idMap) {
			var post = idMap[postID];
			if (idMap[post.parent]) {
				//post.parent.children || (post.parent.children=[]);
				//console.log("POST PARENT:", post.parent)
				idMap[post.parent].children.push(post);
			}
		}
    	$scope.$apply(function(){
    		$scope.treeRoot = rootPost;
    		console.log("TREE UPDATED:", $scope.treeRoot);
    	});
    }

    pod.onLogin(function(){
    	console.log("THREAD:", $route.current.params);
		var postsCount = 0;
		pod.query().filter( {
			type: "post",
			thread_id: "http://" + 
				$route.current.params.authorURL + 
				"/" + $route.current.params.threadID //TODO: Make this neater
		}).onAllResults(function(posts){
			if (posts.length !== postsCount) {
				postsCount = posts.length;
				for (var i=0; i<posts.length; i++) {
					var post = posts[i];
					idMap[post._id] = post;
					if (post.is_root) {
						rootPost = post;
					}
				}
				updateTree();
			}
		}).start();
    });

    $scope.replyToRoot = function() {
    	var text = $("#myReplyToRoot").val();
    	if (!text) {
			alert("Text must not be blank");
		} else {
			//alert("ROOT REPLY: "+text);
		    var reply = {
		    	type: "post",
		        text: text,
		        author: bareURL(pod.getUserId()),
		        parent: rootPost._id,
		        thread_id: "http://" + 
					$route.current.params.authorURL + 
					"/" + $route.current.params.threadID, //TODO: Make this neater
		        forum: $route.current.params.forumURL
		    };
		    pod.push(reply, function(){
		    	$("textarea").val("");
		    });
		}
    }

    $scope.replyToComment = function(localScope) {
    	console.log("LS!", localScope);
    	var parentID = localScope.comment._id;
    	//alert(parentID);
    	var textarea = $("textarea.myReplyToComment[tocomment='"+parentID+"']");
    	var text = textarea.val();
    	if (!text) {
			alert("Text must not be blank");
		} else {
			//alert("COMMENT REPLY: "+text);
		    var reply = {
		    	type: "post",
		        text: text,
		        author: bareURL(pod.getUserId()),
		        parent: parentID,
		        thread_id: "http://" + 
					$route.current.params.authorURL + 
					"/" + $route.current.params.threadID, //TODO: Make this neater
		        forum: $route.current.params.forumURL
		    };
		    pod.push(reply, function(){
		    	console.log("SUCCESSFULLY COMMENT REPLY");
		    	$("textarea").val("");
		    	//$(".replyBox").hide();
		    });
		}
    }


  }
]);



rostrumControllers.controller('UserCtrl', ['$scope', '$route', /* '$http',*/
  function ($scope, $route) {
    $scope.userURL = $route.current.params.userURL;
    $scope.semiBareURL = semiBareURL;
    pod.onLogin( function(){
    	pod.query().filter( {
			_id: "http://"+$route.current.params.userURL +"/" //TODO: Make better
		}).onAllResults(function(profiles) {
	    	//console.log("GOT PROFILES!", profiles);
	    	if (profiles.length) {
		    	$scope.$apply(function(){
		    		$scope.profile = profiles[0];
		    	});
		    }
	    }).start();

	    pod.query().filter( {
			author: $route.current.params.userURL
		}).onAllResults(function(activity) {
			//console.log("ACTIVITY:", activity);
	    	if (activity.length) {
		    	$scope.$apply(function(){
		    		$scope.activity = activity;
		    	});
		    }
	    }).start();


	    pod.query().filter( {
	    	type: "subscription",
	    	_owner: "http://"+$scope.userURL+"/" //TODO: Make this better
	    }).onAllResults(function(subscriptions){
	    	if (subscriptions.length) {
		    	$scope.$apply(function(){
		    		$scope.subscriptions = subscriptions;
		    	});
		    }
	    }).start();
    } );

  }
]);

