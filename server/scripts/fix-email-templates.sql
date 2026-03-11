-- One-time script: Add 7 missing email templates + update TXN-4 body
-- Run against production DB after deploying the code fix.
-- Usage: psql $DATABASE_URL -f scripts/fix-email-templates.sql

-- Update TXN-4 template body to mention WeChat QR
UPDATE "EmailTemplate"
SET "body" = E'你好 {userName}，\n\n欢迎加入串门儿这个大家庭！🎉\n\n串门儿是一群朋友通过小型聚会认识彼此、相互支持的地方。看电影、做饭、徒步、桌游……你现在可以：\n• 浏览和报名感兴趣的活动\n• 推荐好看的电影和书\n• 给朋友发一张感谢卡\n\n👇 扫码加入串门儿微信群，认识大家：\n\n有什么想法随时跟大家说，这里没什么规矩，交到朋友最重要 😊'
WHERE "ruleId" = 'TXN-4' AND "variantKey" = 'default';

-- P0-D: Same-day event reminder
INSERT INTO "EmailTemplate" ("ruleId", "variantKey", "subject", "body", "isActive")
VALUES ('P0-D', 'default', '【串门儿】今天见！「{eventTitle}」', E'你好 {userName}，\n\n提醒一下，「{eventTitle}」就在今天啦！\n\n时间：{eventDate}\n地点：{eventLocation}\n\n准备好了吗？今天见 🤗', true)
ON CONFLICT ("ruleId", "variantKey") DO NOTHING;

-- P2-A: New event notification
INSERT INTO "EmailTemplate" ("ruleId", "variantKey", "subject", "body", "isActive")
VALUES ('P2-A', 'default', '【串门儿】新活动来了！{hostName} 组了「{eventTitle}」', E'你好 {userName}，\n\n{hostName} 刚发布了一个新活动——「{eventTitle}」🎉\n\n时间：{eventDate}\n地点：{eventLocation}\n\n感兴趣的话快去报名吧，名额有限哦～', true)
ON CONFLICT ("ruleId", "variantKey") DO NOTHING;

-- P2-B: New recommendation notification
INSERT INTO "EmailTemplate" ("ruleId", "variantKey", "subject", "body", "isActive")
VALUES ('P2-B', 'default', '【串门儿】{authorName} 推荐了「{recTitle}」', E'你好 {userName}，\n\n{authorName} 刚分享了一个新推荐——「{recTitle}」✨\n\n快去看看有没有兴趣吧～', true)
ON CONFLICT ("ruleId", "variantKey") DO NOTHING;

-- P3-A: One-week onboarding check-in
INSERT INTO "EmailTemplate" ("ruleId", "variantKey", "subject", "body", "isActive")
VALUES ('P3-A', 'default', '【串门儿】{userName}，加入一周啦！', E'你好 {userName}，\n\n不知不觉你加入串门儿已经一周了！还习惯吗？😊\n\n如果还没参加过活动的话，可以看看最近有什么感兴趣的，第一次参加会格外开心哦～\n\n有任何问题随时问，大家都很友善的！', true)
ON CONFLICT ("ruleId", "variantKey") DO NOTHING;

-- P3-B: Post-first-event follow-up
INSERT INTO "EmailTemplate" ("ruleId", "variantKey", "subject", "body", "isActive")
VALUES ('P3-B', 'default', '【串门儿】「{eventTitle}」玩得开心吗？', E'你好 {userName}，\n\n恭喜你参加了第一次串门儿活动「{eventTitle}」！🎉\n\n第一次感觉怎么样？希望你玩得开心！\n\n你可以：\n✉️ 给同伴寄一张感谢卡\n📷 上传活动照片\n💬 留下你的想法\n\n期待在下次活动见到你！', true)
ON CONFLICT ("ruleId", "variantKey") DO NOTHING;

-- P3-C: New member nudge
INSERT INTO "EmailTemplate" ("ruleId", "variantKey", "subject", "body", "isActive")
VALUES ('P3-C', 'default', '【串门儿】{userName}，最近有这些活动哦', E'你好 {userName}，\n\n你加入串门儿有几天了，有没有看到感兴趣的活动呀？\n\n最近有这些活动你可能喜欢：{upcomingEvents}\n\n勇敢迈出第一步，大家都很期待认识你 😊', true)
ON CONFLICT ("ruleId", "variantKey") DO NOTHING;

-- P4-B: Weekly recommendation digest
INSERT INTO "EmailTemplate" ("ruleId", "variantKey", "subject", "body", "isActive")
VALUES ('P4-B', 'default', '【串门儿】本周新推荐一览 📚', E'你好 {userName}，\n\n这周社区又有 {newRecCount} 条新推荐啦！\n\n{recList}\n\n快去看看有没有感兴趣的吧～', true)
ON CONFLICT ("ruleId", "variantKey") DO NOTHING;
