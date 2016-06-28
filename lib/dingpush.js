(function(module) {
	"use strict";
	var winston = require("winston"),
		request = module.parent.require("request"),
		nodebb = require("./nodebb"),
		async = module.parent.require("async"),
		user = nodebb.user,
		db = nodebb.db;
	var crypto = require("crypto");
	var translator = nodebb.translator;
	var notifications = {},
		app;
	var clientId = "162029";
	var user_list=[];
	var user_index=0;
	var ff = {};
	var domain="jz.fosun.com";
	ff.generateSecretKeyByClientid = function(clientid) {
		return ff.md5("FOSUN;" + clientid) + ff.md5("webapi")
	};
	ff.md5 = function(data) {
		var Buffer = require("buffer").Buffer;
		var buf = new Buffer(data);
		var str = buf.toString("binary");
		return crypto.createHash("md5").update(str).digest("hex").toUpperCase()
	};
	ff.generateSign = function(ms, clientid, secretkey) {
		return ff.md5(ms + clientid + secretkey)
	};
	ff.getDingUser = function(email, callback) {
		var reg = /^0?1[3|4|5|8][0-9]\d{8}$/;
		var mobile;
		var temp = email;
		var mm = email.substring(0, email.lastIndexOf("@"));
		if (reg.test(mm)) {
			mobile = parseInt(mm);
			temp = null
		}
		var url = "http://o.fosun.com/uuc/fosun/out/outwork/getEmployeesDetails?";
		var temp_url = url;
		if (temp) {
			url += "email=" + email;
		} else {
			url += "mobile=" + mobile;
		}
		request.post(url, function(err, req, result) {
			try {
				eval("(" + result + ")")[0].jobCode;
				callback(err, eval("(" + result + ")")[0].jobCode)
			} catch (err) {
				winston.info("邮箱获取用户钉钉ID失败:" + url);
				//winston.info(err);
				//winston.info(result);
				temp_url += "jobCode=" + email;
				request.post(temp_url, function(err, request, rr) {
					try {
						eval("(" + rr + ")")[0].jobCode;
						callback(err, eval("(" + rr + ")")[0].jobCode)
					} catch (err) {
						winston.info("jobcode获取用户钉钉ID失败:" + temp_url);
						//winston.info(err);
						callback(new Error(email+"获取钉钉ID失败"));
					}
				})
			}
		})
	};
	ff.findPost = function(pid, callback) {
		db.client.collection("objects").findOne({
			"_key": "post:" + pid
		}, function(err, item) {
			callback(err, item)
		})
	};
	ff.findTopic = function(tid, callback) {
		db.client.collection("objects").findOne({
			"_key": "topic:" + tid
		}, function(err, item) {
			callback(err, item)
		})
	};
	ff.findUser = function(uid, callback) {
		db.client.collection("objects").findOne({
			"_key": "user:" + uid
		}, function(err, item) {
			callback(err, item)
		})
	};
	ff.findUserSetting = function(uid, callback) {
		db.client.collection("objects").find({
			"_key": "user:" + uid + ":settings"
		}, function(err, item) {
			callback(err, item)
		})
	};
	ff.findAllUser = function(callback) {
		db.client.collection("objects").find({
			"_key": {
				$regex: /user:[0-9]*$/i
			}
		}, {
			email: 1,
			uid: 1,
			_id: 0
		}, function(err, item) {
			callback(err, item)
		});
		/*db.client.collection('wc').find(function(err,item){
                callback(err,item);
        });*/
		/*db.client.collection('objects').find({"_key":{$regex:/user:[0-9]*$/i},"email":{$in:["ningg@fosun.com",
			"guojj@fosun.com",
			"yangjj@fosun.com",
			"798246835@qq.com"
		]}},{email:1,uid:1,_id:0},function(err,item){
                callback(err,item);
        })*/
	};
	ff.saveUserGroup = function(email, chatid, callback) {
		db.client.collection("dinggroup").insert({
			"email": email,
			"chatid": chatid
		}, function(err) {
			callback(err, chatid)
		})
	};
	ff.findChatid = function(email, callback) {
		db.client.collection("dinggroup").findOne({
			"email": email
		}, function(err, item) {
			callback(err, item)
		})
	};
	ff.createDingGroup = function(rightsign, tn, userid, callback) {
		var url = "https://oapi.fosun.com/api/groupchat/create?clientid=" + clientId + "&sign=" + rightsign + "&timestamp=" + tn;
		var dd = {
			name: "IT社区系统消息",
			owner: "it_noreply@fosun.com",
			useridlist: ["it_noreply@fosun.com", userid]
		};
		var options = {
			url: url,
			headers: {
				"Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
			},
			encoding: "UTF-8",
			form: {
				text: JSON.stringify(dd)
			}
		};
		request.post(options, function(err, request, bb) {
			bb = eval("(" + bb + ")");
			if (bb.errcode == 0) {
				callback(err, bb.chatid)
			} else {
				winston.info(bb);
				winston.info(userid + "创建群会话失败：" + bb.errmsg);
				callback(new Error(userid + "创建群会话失败："));
			}
		})
	};
	ff.checkGroup = function(rightsign, tn, chatid, callback) {
		var url = "https://oapi.fosun.com/api/groupchat/get?clientid=" + clientId + "&sign=" + rightsign + "&timestamp=" + tn + "&chatid=" + chatid;
		request.post(url, function(err, request, result) {
			try{
				result = eval("(" + result + ")");
				var flag = true;
				if (result.chat_info.useridlist.length < 2) {
					winston.info(chatid + "群不存在");
					db.client.collection("dinggroup").remove({
						"chatid": chatid
					});
					flag = false;
				}
				callback(err, flag);
			}catch(err){
				winston.info("检测状态失败");
				winston.info(JSON.stringify(result));
				db.client.collection("dinggroup").remove({
					"chatid": chatid
				});
				flag = false;
				callback(err, flag);
			}
			
		})
	};
	ff.sendGroupMsg = function(rightsign, tn, chatid, msg,callback) {
		var url = "https://oapi.fosun.com/api/groupchat/sendOa?clientid=" + clientId + "&sign=" + rightsign + "&timestamp=" + tn;
		if (!msg.color) {
			msg.color = "FF54B2B7"
		}
		var dd = {
			"chatid": chatid,
			"sender": "it_noreply@fosun.com",
			"msgtype": "oa",
			"oa": {
				"message_url": msg.url,
				"pc_message_url": msg.url,
				"head": {
					"bgcolor": msg.color,
					"text": "温馨提示"
				},
				"body": {
					"title": msg.title || "",
					"content": msg.content
				}
			}
		};
		var options = {
			url: url,
			headers: {
				"Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
			},
			encoding: "UTF-8",
			form: {
				text: JSON.stringify(dd)
			}
		};
		request.post(options, function(err, request, result) {
			result = eval("(" + result + ")");
			var flag=true;
			if (result.errcode == 0) {
			} else {
				flag=false;
				winston.info(result);
				winston.info(chatid + "群消息发送失败：" + result.errmsg)
				callback(new Error(chatid + "群消息发送失败"));
			}
			callback(err,flag);
		})
	};
	ff.sendInOne = function(email, rightSign, ts, msg,callback) {
		async.waterfall([function(cb) {
			ff.getDingUser(email, function(err, results) {
				cb(err, results);
			})
		}, function(results, cb) {
			ff.createDingGroup(rightSign, ts, results, function(err, results) {
				cb(err, results);
			})
		}, function(results, cb) {
			ff.saveUserGroup(email, results, function(err, results) {
				cb(err, results);
			})
		}], function(err, results) {
			ff.sendGroupMsg(rightSign, ts, results, msg,function(err,result){
				callback(err,result);
			});
		})
	};
	ff.sendMsgUser = function(email, msg,callback) {
		var ts = Math.round(new Date().getTime() / 1000);
		var secretKey = ff.generateSecretKeyByClientid(clientId);
		var rightSign = ff.generateSign(ts, clientId, secretKey);
		try {
			async.waterfall([function(cb) {
				//查找用户chatid
				ff.findChatid(email, function(err, results) {
					cb(err, results);
				})
				//判断是否存在
			}, function(results, cb) {
				if (results) {
					ff.checkGroup(rightSign, ts, results.chatid, function(err, flag) {
						if (flag) {
							ff.sendGroupMsg(rightSign, ts, results.chatid, msg,function(err,results){
								cb(err, results);
							})
						} else {
							ff.sendInOne(email, rightSign, ts, msg,function(err,results){
								cb(err, results);
							})
						}
					})
				}else{
					ff.sendInOne(email, rightSign, ts, msg,function(err,results){
						cb(err, results);
					});
				}
			}], function(err, results) {
				if(results){
					winston.info(email+"用户消息发送成功");						
				}
				if(callback){
					callback();
				}
			})
		} catch (err) {
			winston.info("发送消息给用户" + email + "失败");
			winston.info(err);
			if(callback){
				callback();
			}
		}
	};
	notifications.pushed = function(params, callback) {
		try{
			var notification = params.notification,
			uids = params.uids;
			var socket = module.parent.parent.require("./socket.io");
			uids.forEach(function(uid) {
				user.getUserData(uid, function(err, uu) {
					translator.translate(notification.bodyShort, function(translated) {
						//过滤回复事件
						if(translated.indexOf("回复")!=-1){
							return;
						}
						var email = uu.email;
						if (email == "admin@fosun.com") {
							email = "yangjj@fosun.com"
						}
						if (!email) {
							return;
						}
						ff.findPost(notification.pid, function(err, post) {
							var msg = {
								url: "http://"+domain+"/vendor/bbs.html?url=http://"+domain+"/topic/" + post.tid,
								content: translated.replace(/<strong>/g, "").replace(/<\/strong>/g, ""),
							};
							ff.sendMsgUser(email, msg);
						})
					})
				})
			})
		}catch(err){
			winston.info(err);
		}
	};
	ff.sendlist=function(msg){
		var user1=user_list[user_index];
		async.waterfall([function(cb) {
			//查找用户配置
			ff.findUserSetting(user1.uid, function(err, item) {
				if (item && item.userLang == "en_US") {
					msg.content = username + " shared a new post 「" + post.title + "」in category「" + post.category.name + "」"
				}
				cb(err, item);
			})
		}],function(results, cb){
			ff.sendMsgUser(user1.email, msg,function(){
				user_index++;
				winston.info("推送进度:"+user_index+"/"+user_list.length);
				if(user_index<user_list.length){
					ff.sendlist(msg);
				}
			});
		})
	}
	notifications.post = function(post) {
		if (post.user.username != "fosun") {
			return
		}
		winston.info("推送文章给所有人:" + post.title);
		var username = post.user.username;
		var msg = {
			title: post.title,
			url: "http://"+domain+"/vendor/bbs.html?url=http://"+domain+"/topic/" + post.tid,
			content: username + " 在「" + post.category.name + "」板块发布了「" + post.title + "」"
		};
		ff.findAllUser(function(err, result) {
			var count=0;
			user_list=[];
			result.forEach(function(user1) {
				if (user1.email == "admin@fosun.com" || !user1.email) {
					return
				}
				winston.info("添加用户队列："+user1.email);
				user_list.push(user1);
				if(count==0){
					user_index=0;
					ff.sendlist(msg);
				};
				count++;
			})
			//winston.info("所有用户发送完毕");
		})
	};
	//推送王灿文章
	notifications.replytouser = function(post) {
		if (post.user.username != "宁广") {
			return
		}
		var msg = {
			title: "火山哥推荐|员工睡眠与组织成本",
			url: "http://"+domain+"/vendor/bbs.html?url=http://"+domain+"/topic/109",
			content: "fosun 在「主题活动」板块发布了「火山哥推荐|员工睡眠与组织成本」"
		};
		ff.findAllUser(function(err, result) {
			var count=0;
			user_list=[];
			result.forEach(function(user1) {
				user1.email=user1.email.trim();
				if (user1.email == "admin@fosun.com" || !user1.email) {
					return
				}
				winston.info("添加用户队列："+user1.email);
				user_list.push(user1);
				if(count==0){
					user_index=0;
					//ff.sendlist1(msg);
				};
				count++;
			})
			//winston.info("所有用户发送完毕");
		})
	};
	ff.sendlist1=function(msg){
		var user1=user_list[user_index];
		ff.sendMsgUser(user1.email, msg,function(){
			user_index++;
			winston.info("推送进度:"+user_index+"/"+user_list.length);
			if(user_index<user_list.length){
				ff.sendlist1(msg);
			}
		});
	}
	notifications.reply = function(post) {
		try{
			winston.info(post.user.username + "回复了" + post.topic.title);
			var email;
			var username = post.user.username;
			var msg = {
				url: "http://"+domain+"/vendor/bbs.html?url=http://"+domain+"/topic/" + post.topic.slug + "/" + post.index,
				content: username + " 评论了您的贴子「" + post.topic.title + "」"
			};
			ff.findTopic(post.tid, function(err, result) {
				if (result.uid == post.uid) {
					return
				}
				ff.findUser(result.uid, function(err, user) {
					var email = user.email;
					if (email == "admin@fosun.com") {
						email = "yangjj@fosun.com"
					}
					if (!email) {
						return
					}
					async.waterfall([function(cb) {
						//查找用户配置
						ff.findUserSetting(user.uid, function(err, item) {
							if (item && item.userLang == "en_US") {
								msg.content = username + " commented in「" + post.topic.title + "」";
							}
							cb(err, item);
						})
					}],function(results, cb){
						ff.sendMsgUser(email, msg);
					})
				})
			})
		}catch(err){
			winston.info(err);
		}
	};
	module.exports = notifications
}(module));

