(function (Ding) {
    'use strict';
    
    var nodebb =require('./lib/nodebb'),
    	winston = nodebb.winston,
    	db = nodebb.db,
    	user = nodebb.user,
    	notification = nodebb.notification,
    	DingPsuh=require('./lib/dingpush');
    	
    // 系统扩展路由
    Ding.rote=function(params, callback){
    	var router = params.router,
	    	apiUri      = '/api/ns/login',
	        unreadUri   = '/api/ns/unread',
	        writeLogin  = '/api/ns/smlogin',
	        languageUri = '/api/ns/language',
	        getsmLoing  = '/api/ns/getsmlogin';
    	//免登陆接口
    	router.post(apiUri,function (req, res, next) {
            var username = req.body.username,
                email = req.body.email,
                picture=req.body.picture,
                fullname=req.body.fullname;
            winston.info('receive request '+username);
            if(!username||!email){
                res.json("false");
            }
            user.getUidByEmail(email, function(err, uid) {
                if (!uid) {
                    user.create({username:username,email:email,picture:picture,fullname:fullname,password:"Fosun@0901!"}, function(err, uid) {
                        if (err !== null) {
                            winston.info(err);
                            res.json("0");
                        } else {
                            // Save their photo, if present
                            if (picture) {
                                user.setUserField(uid, 'uploadedpicture', picture);
                                user.setUserField(uid, 'picture', picture);
                            }
                            if(req.body.userLang){
                                var str="user:"+uid+"settings";
                                db.client.collection('objects').insert({"_key":str,"userLang":"en_US"});
                            }
                            res.json("2");
                        };
                    });
                } else {
                    res.json("1");
                }
            });
        });
    	//钉钉扫码接口
        router.post(writeLogin,function (req, res, next) {
            winston.info(req.body.email+"扫码");
            db.client.collection('codelogin').insert(req.body);
            res.json("true");
        });
        //扫码轮询接口
        router.post(getsmLoing,function (req, res, next) {
            db.client.collection('codelogin').findOne({"timestamp":req.body.timestamp},function(err,item){
                res.json(item); 
            });
        });
        //未读消息接口
        router.get(unreadUri,function (req, res, next) {
            var email = req.query.email;
            user.getUidByEmail(email, function(err, uid) {
                if(err){
                    res.json("0");
                }
                notification.getUnreadCount(uid,function(err,tids){
                    res.json(tids); 
                });
            })
        });
        //设置语言接口
        router.get(languageUri,function(req, res, next){
            var email = req.query.email;
            var yy=req.query.language;
            user.getUidByEmail(email, function(err, uid) {
                if(err){
                    res.json("false");
                }
                var str="user:"+uid+":settings";
                db.client.collection('objects').update({"_key":str},{"$set":{"userLang":yy}},true);
                winston.info(email+"设置语言"+yy);
                res.json("true");
            })
        })
        //后台帖子推送
        
        //钩子回调
        callback();
    }
    //全员帖子推送
    Ding.post = function(post) {
    	DingPsuh.post(post);
	};
    //系统消息推送
    Ding.pushed = function(params, callback) {
    	DingPsuh.pushed(params, callback)
	};
	//帖子回复通知
	Ding.reply = function(post) {
		DingPsuh.reply(post);
	};
	//帖子文章过滤
	Ding.image = function(postContent, callback) {
		postContent.postData.content = postContent.postData.content.replace( /\<img src\=\"?(.*)\" alt\=\"?(.*)\" (.*)\/\>/g , '<a class="lightboxlink" href="$1" data-lightbox="$2"><img class="lightboximage" src="$1" alt="$2"></a>');
	    callback(null, postContent);
	}
})(module.exports);