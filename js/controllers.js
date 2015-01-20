var rostrumControllers = angular.module('rostrumControllers', []);

rostrumControllers.controller('HomeCtrl', ['$scope',/* '$http',*/
  function ($scope/*, $http*/) {
    /*$http.get('phones/phones.json').success(function(data) {
      $scope.phones = data;
    });*/

	//$scope.home || ($scope.home = {});

	$scope.semiBareURL = semiBareURL;

	pod.onLogin(function(){
		var subscriptionsCount = 0;
		pod.query().filter( {
	    	type: "subscription",
	    	_owner: pod.getUserId() 
	    }).onAllResults(function(subscriptions){
	    	if (subscriptionsCount !== subscriptions.length) {
		    	subscriptionsCount = subscriptions.length
		    	if (subscriptions.length) {
			    	$scope.$apply(function(){
			    		$scope.subscriptions = subscriptions;
			    		updateFeed();
			    	});
			    }
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

/*
function submitPost() {
	var title = $("#myThreadTitle").val();
	var text = $("#myThreadText").val();
	if (!title) {
		alert("Title must not be blank");
	} else {
		addThread(currentForumURL, title, text); //TODO: Global abatement
	}
}*/

rostrumControllers.controller('ForumCtrl', ['$scope', '$route',
  function ($scope, $route) {
    /*$http.get('phones/phones.json').success(function(data) {
      $scope.phones = data;
    });*/

	//console.log("SCOPE!", $scope);
	//console.log("FORUM!", $route);

	$scope.route = $route;

	$scope.semiBareURL = semiBareURL;

	$scope.settingsVisible = false;
	$scope.toggleSettings = function() {
		$scope.settingsVisible = !($scope.settingsVisible);
	}


	$scope.addModerator = function() {
		var newModerator = prompt("Moderator URL:");
		newModerator = bareURL(newModerator);
		if (newModerator) {
			pod.push({
				type: "moderatorSubscription",
				forum: $route.current.params.forumURL,
				moderator: newModerator
			}, function(){
				console.log("SUCCESSFULLY ADDED MODERATOR");
			});
		}
	}

	$scope.deleteModerator = function(that) {
		console.log("DELETING MOD:", that, that.ms._id);
		pod.delete({_id: that.ms._id});
	}

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
    $scope.forumModerators = [];
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

	    //TODO: This is very redundant with the "getModerators()" function below
		var modsCount = 0;
		pod.query().filter({
			type: "moderatorSubscription",
			forum: $route.current.params.forumURL,
			_owner: pod.getUserId(),
			moderator: { "$exists": true }
		}).onAllResults(function(mss){
			//console.log("mods:", mss);
			if (mss.length !== modsCount) {
				modsCount = mss.length;
				$scope.$apply(function(){
	    			$scope.forumModerators = mss;
	    			console.log("MSS", mss);
	    		});
			}
		}).start()


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
    // Setup procedure:
    // getPosts -> getModerators -> getHidings -> updateTree
    // However, if the thread doesn't change, skip straight from getPosts to updateTree.
    pod.onLogin(getPosts);

    var idMap = {};
    var rootPost, rootID;
    $scope.treeRoot;
    function getPosts(){
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
				if (rootPost._id === rootID) {
					updateTree();
				} else {
					rootID = rootPost._id;
					getModerators();
				}
			}
		}).start();
	}

	var moderators = [];
	function getModerators() {
		console.log("GETTING MODERATORS FOR FORUM:", rootPost.forum);
		pod.query().filter({
			type: "moderatorSubscription",
			forum: rootPost.forum,
			_owner: pod.getUserId()
		}).onAllResults(function(mss){
			moderators = mss.map(function(ms){return ms.moderator});
			//moderators = []; //EXAMPLE
			moderators.push(bareURL(pod.getUserId())); //Add yourself as a moderator
			getHidings();
		}).start()
	}

	var hidings = false;
	var ohsl = -1;
	function getHidings() {
		// TODO: Only ask for these from subscribed moderators,
		// and updateTree asynchronously, so we don't have to wait for laggy moderators.
		pod.query().filter({ 
			type: "hiding",
		    thread_id: "http://" + 
				$route.current.params.authorURL + 
				"/" + $route.current.params.threadID, //TODO: Make this neater
		}).onAllResults(function(hs){
			//console.log("GOT HIDINGS:", hs);
			if (ohsl !== hs.length) {
				ohsl = hs.length;
				hidings = hs.filter(function(hiding){
					return moderators.indexOf(bareURL(hiding._owner)) !== -1
				});
				console.log("FILTERED HIDINGS:", hidings);
				updateTree();
			} /*else {
				console.log("WHY WON'T YOU STOP CALLING THIS!");
				//TODO: What's going on here?
			}*/
			
		}).start();
	}


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
		for (var i=0; i<hidings.length; i++) {
			var hiding = hidings[i];
			console.log("HIDING:", hiding);
			idMap[hiding.subject_id]["hidden"] = true;
		}
    	$scope.$apply(function(){
    		$scope.treeRoot = rootPost;
    		console.log("TREE UPDATED:", $scope.treeRoot);
    	});
    }


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
		        //forum: $route.current.params.forumURL
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
		        //forum: $route.current.params.forumURL
		    };
		    pod.push(reply, function(){
		    	console.log("SUCCESSFULLY COMMENT REPLY");
		    	$("textarea").val("");
		    	//$(".replyBox").hide();
		    });
		}
    }

    $scope.submitHide = function(localScope) {
    	if (confirm("Are you sure?")) {
    		//console.log("HIDE LS!", localScope);
    		var subjectID = localScope.comment._id;
    		console.log("SUBJECT:", subjectID);
    		var hiding = {
    			type: "hiding",
    			author: bareURL(pod.getUserId()),
    			//forum: $route.current.params.forumURL,
		        thread_id: "http://" + 
					$route.current.params.authorURL + 
					"/" + $route.current.params.threadID, //TODO: Make this neater
    			subject_id: subjectID
    		}
    		pod.push(hiding, function(){
    			console.log("SUCCESFULLY SUBMITTED HIDING");

    		});
    	}
    }

    //TODO: reduce redundancy

    $scope.submitUnhide = function(localScope) {
    	alert("this doesn't actually work");
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

