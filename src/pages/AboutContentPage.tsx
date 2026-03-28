import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { marked } from 'marked';
import { fetchAboutContentApi } from '@/lib/domainApi';
import { RichTextViewer } from '@/components/RichTextEditor';

/* ── Mesh-gradient banner per content type ── */
const bannerConfig: Record<string, { base: string; glows: string[] }> = {
  principle: {
    base: '#1e1610',
    glows: [
      'radial-gradient(ellipse at 25% 35%, rgba(212,165,116,0.4) 0%, transparent 60%)',
      'radial-gradient(ellipse at 75% 65%, rgba(200,140,80,0.25) 0%, transparent 55%)',
      'radial-gradient(ellipse at 55% 15%, rgba(232,200,160,0.15) 0%, transparent 50%)',
    ],
  },
  host_guide: {
    base: '#101a14',
    glows: [
      'radial-gradient(ellipse at 30% 45%, rgba(107,203,119,0.3) 0%, transparent 55%)',
      'radial-gradient(ellipse at 70% 35%, rgba(140,200,160,0.22) 0%, transparent 50%)',
      'radial-gradient(ellipse at 45% 80%, rgba(212,165,116,0.15) 0%, transparent 50%)',
    ],
  },
  about: {
    base: '#14101e',
    glows: [
      'radial-gradient(ellipse at 30% 35%, rgba(130,110,210,0.35) 0%, transparent 55%)',
      'radial-gradient(ellipse at 72% 60%, rgba(91,141,239,0.25) 0%, transparent 50%)',
      'radial-gradient(ellipse at 50% 15%, rgba(180,160,220,0.15) 0%, transparent 50%)',
    ],
  },
  letter: {
    base: '#1a1410',
    glows: [
      'radial-gradient(ellipse at 35% 40%, rgba(210,150,110,0.35) 0%, transparent 55%)',
      'radial-gradient(ellipse at 68% 60%, rgba(212,165,116,0.25) 0%, transparent 50%)',
      'radial-gradient(ellipse at 50% 15%, rgba(230,190,150,0.15) 0%, transparent 50%)',
    ],
  },
  legal: {
    base: '#10141a',
    glows: [
      'radial-gradient(ellipse at 30% 45%, rgba(100,145,190,0.3) 0%, transparent 55%)',
      'radial-gradient(ellipse at 72% 38%, rgba(80,125,175,0.22) 0%, transparent 50%)',
      'radial-gradient(ellipse at 50% 80%, rgba(130,160,200,0.12) 0%, transparent 50%)',
    ],
  },
};

const grainSvg = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`;

/**
 * Fix broken Notion-imported content: a single <p> wrapping flattened markdown
 * where newlines became spaces. Restore line breaks so marked can parse it.
 */
function normalizeContent(raw: string): string {
  const m = raw.match(/^<p>([\s\S]+)<\/p>\s*$/);
  if (!m || !/#{2,}\s/.test(m[1])) return raw;
  return m[1]
    .replace(/ (---) /g, '\n\n$1\n\n')
    .replace(/ (#{2,6} )/g, '\n\n$1')
    .replace(/ (- )/g, '\n$1');
}

/** Static fallback for content types not in DB */
const staticContent: Record<string, { title: string; body?: string[]; md?: string }> = {
  principle: {
    title: '串门原则',
    md: `其实是一些曾经没有特别明确的原则，在这里试图去说得更加明确一些

# 串门是什么

串门是一个帮助大家建立真实连接的社群。

我们做的事很简单：

> 组织活动，让人见面。在反复见面的过程中，找到聊得来的人，慢慢变成朋友。

*- 相比对这个世界的不满，我们更希望通过自己做一些事，让这个世界更接近我们想要的样子*

*- 相比萍水相逢，我们更希望能够有深度的交流和长久的联系*

*- 相比一起吃喝玩乐，我们更希望能真诚的在乎彼此，提供力所能及的帮助*

*- 相比其乐融融，我们更希望礼貌但真诚的表达和沟通*

- **我们是一个熟人社区，但大多数都是从陌生人开始的认识的。** 我们不是交友或者 networking 平台。
- **我们是一个彼此信任、互相支持的朋友圈子。** 我们不是一个活动运营组织 （至少目前不是） — 活动只是手段，人才是目的。
- **我们是一群平等的朋友。** 我们不是一个中心化的商业机构（至少目前不是）

---

## 关于交朋友

朋友这个词的重量对于每个人来说可能不一样，对于我们来说朋友是生活中非常重要的一部分，其中有的是 extended family，甚至就是 family。因此，这件事值得非常认真对待。

交朋友没有捷径。需要真诚，需要时间，需要你主动。

- **真诚是前提。** 彼此坦诚才能建立信任，有来有往才能建立联系。
- **持续出现是关键。** 你不必一直做 Host，但持续参与、重复见面，是从认识变成熟悉，以至于朋友的唯一方式。
- **这是你自己的事。** 串门儿的朋友们愿意分享经验、和你一起做实验、一起构建。

---

## 我们鼓励

- **把真实的生活带进来。** 工作上的困惑、生活里的迷茫、一个还没想清楚的决定，这些不是需要藏起来的东西，怎么找到喜欢的工作、怎么跟室友相处、怎么在异国他乡让自己过得舒服一点。这些话题在串门永远受欢迎。串门存在的意义之一，就是让你有地方聊这些，和愿意认真听的人。
- **一起创造点什么。** 一顿饭、一场电影活动、一次即兴的公路旅行，或者一个还没成型的想法。最好的关系往往不是聊出来的，是一起做事的过程中长出来的。
- **力所能及地帮助**
- **对人保持好奇**
- **感激彼此**
- **包容不同的声音**
- **善良和真诚**

---

## 我们不欢迎

- **侵犯边界。** 未经同意的过度亲密、不请自来、强行加微信、打听别人不想说的事。每个人有权决定自己分享多少。
- **虚伪和功利。** 带目的接近人，把关系当资源经营。大家出来是交朋友的，不是被转化的。
- **等级感和优越感, 以种族、国籍、性别、性取向、教育背景排斥或贬低他人。** 以学历、公司、收入来划分人，对别人的生活方式指指点点
- **对 Host 不礼貌。** 迟到不说、临时放鸽子、对场地和食物挑三拣四、不遵守 Host 的规则
- **公开冲突和没必要的Drama**

遇到以上行为，管理员有权介入。严重或重复的情况，会被移出社群。

---

# 串门日常

串门的日常通过微信群沟通，活动发布和报名在串门儿平台上完成。

活动通常是8-10人的小聚，在成员家里或约好的地方。电影、potluck聚餐、户外徒步、节日派对……什么形式都可以有，由 Host 自己决定。

群里也是聊天的地方。分享一个好去处、问一个生活问题、发一个有意思的东西，都可以。

---

## 参与的方式

参与串门不只有"参加活动"一种。以下是你可以参与的各种方式：

- **日常的参与**：最简单的开始方式。在活动日历上找一个感兴趣的活动，报名，出现。Potluck 的时候带一道家庭秘制红烧肉，去别人家串门顺手拎一盒草莓或者一瓶你觉得还不错的酒，吃完饭帮忙收盘子洗碗，或者分享最近在研究一个特别有意思的东西。聊天的时候认真倾听，给予反馈。
- **提名和投票电影。** Movie Night 的片单由大家共同决定。你可以在串门电影页面提名你想看的电影，也可以给别人提名的电影投票。票数最高的会被选中放映。当然Host有权力推翻选票。
- **串门大转盘。** 每周我们会随机抽签2个人，轮流做发起人，约一次 coffee chat 或小聚。不需要准备什么大活动，就是创造一个低门槛的见面机会，让不常碰面的人也能聊起来。
- **当 Host，组个局。** 你有想做的事就发起一个活动，喊大家来。具体怎么做，请看 Host 手册。
- **参与种子计划。** 如果你有一个 side project 或者想学的技能。写东西、拍胶片、做游戏、学画画，可以在种子计划页面建一个自己的项目页，记录进度。也可以分享现状和困难，其他人可以围观、组队或提供支持。不是互卷的工作汇报，没有进度也完全没问题，没有进度其实更需要支持。
- **帮忙做内容。** 拍照、写活动回顾、给小红书供稿、写 newsletter。都是让串门被更多对的人看到的方式。也欢迎自荐做各种内容志愿者。
- **推荐朋友。** 如果你身边有你觉得合适的人，介绍他们来。

不必做所有事。找到你舒服的方式参与就好。

---

## 关于安全

- **Host 有权拒绝任何人参加自己的活动**，不需要解释理由。这是对打开家门的人最基本的尊重。
- 遇到让你不舒服的情况，请联系管理员，我们会一起处理。
- 每位参与者对自己的安全负责。Host 尽力创造好的环境，但不需要承担超出合理范围的责任。

## 关于照片

活动中拍摄的照片可能会被用于串门的公开渠道（小红书、公众号等）。如果你不希望自己的照片被公开使用，请提前告知 Host 或管理员。`,
  },
  host_guide: {
    title: 'Host 手册',
    md: `***愿意当 Host 的人，是串门儿最珍贵的人。** 你打开了一个空间，让一群人有了见面的理由。这件事比你想的重要得多。*

# Host 指南

简单说：你想做个什么事，然后喊大家一起来。这就是 Host。

开放客厅非常欢迎，但不是必选项。你也可以组一次徒步、约一顿餐厅饭局、发起一场攀岩、带大家去一个你发现的好地方。Host 的重点是"发起"，不是"提供场地"。

下面用电影夜举例，走一遍完整流程。其他活动大同小异。

---

## 谁可以当 Host

参加过至少一次串门活动的成员都可以。

第一次不确定怎么弄，找一个有经验的 Host 一起 co-host 就行。

---

## 怎么做？

### 第一步：定时间，建活动

到活动日历点"新建"：

- 活动名称（比如"周六电影夜"）
- 日期和时间
- 地点（你家地址，或者写"Host家中，报名后告知"）
- 人数上限（建议 8-10 人）
- Host 选自己

### 第二步：摸个底（看情况）

**日常活动（电影、potluck）直接发起就行，不用犹豫。** 大家已经习惯了这类活动，有人来就来。

**如果是新玩法（比如第一次搞读书会、桌游夜、或者什么奇怪的PPT分享），建议先在群里问一句**，"有人对 XX 感兴趣吗？"有人响应了，这事就成了一半，甚至自然会有人说"我可以帮忙"。你不是一个人在搞，别给自己太大压力。

**如果你想针对性邀请某些人，先小窗再群发。** 比如你想和上次聊得来的几个人再见，先私聊确认他们的时间，再发群里开放报名。

**你可以邀请串门社群外的朋友。** 你觉得合适就行。

**你有权筛选报名的人。** 如果对某个报名者不熟悉或不放心，可以先聊两句再决定。不需要解释理由。

### 第三步：准备内容

**选片：** 去串门电影页面看大家投票最高的，或者你自己选也行，Host具有一切的决定权。

**写清楚你的 house rules：** 比如要不要换鞋、能不能带宠物、几点结束、potluck 每人带什么。写在活动页面里，省得群里反复问。

**想一下活动流程：** 不用很精确，大概就行

### 第四步：同步串门运营

把活动信息告诉社交媒体运营，他们会：

- 做海报
- 开放报名
- 发小红书等社交媒体

如果你有想要发的图片或者文案，当然更欢迎了，没有的话我们就看着写了。

### 第五步：找一个人负责记录

在报名的人里找一个愿意拍照的，活动结束后把照片整理好传到活动页面。不用专业，手机随手拍就行。

### 第六步：活动当天

**别担心家里不够完美。** 没椅子？让大家自带露营椅，坐地上也没关系。没碗筷？一次性的就行，或者让大家自带也可以。没时间准备吃的？Potluck 分包给大家。

**提前准备：**

- 片源找好、测试过能播
- 投影/电视/音响调好
- 吃的喝的到位

**活动中：**

- 注意第一次来的人，帮忙介绍一下
- 其他的不用管太多，氛围到了自然会聊起来

**Vibe control 小技巧：** 聊天的时候放点背景音乐，会更放松。音量是个隐形开关 — 大声就是热闹的 party，小声重点就回到对话上。你可以根据现场氛围随时调。

**观察谁留到最后。** 愿意留下来帮忙收拾、多聊一会的人，往往就是你下次最想邀请的人。

### 第七步：活动结束

记录人把照片整理好，上传到活动页面。完事。

---

## 如果遇到气场不合的怎么办？

**你可以拒绝任何人参加你的活动，不需要解释。** 这是打开家门的人最基本的权利。

如果你愿意，请把这个倾向告诉运营管理员。如果一个人被多个 Host 明确拒绝，说明可能不适合这个社群，运营会处理。

---

## 新手建议

- **从小开始** — 第一次搞个 3-5 人的电影夜或 potluck 就够了，人少反而聊得深
- **不用完美** — 大家来是为了见人聊天，不是来打分的
- **提前说清楚** — house rules、费用、取消政策，早讲比事后扯皮好
- **有问题群里问** — 其他 Host 都经历过，会帮你

---

有想法就去**活动日历**创建。Host 的目标不是办一场完美的活动，是**让大家有个新的机会一起在一个空间，面对面，认识彼此**。`,
  },
  letter: {
    title: '写给还没来串门的你',
    body: [
      '你好，',
      '',
      '如果你正在看这封信，大概率你是通过某个朋友、某条小红书、或者某个偶然听说了串门儿。',
      '',
      '我们是一群住在新泽西（偶尔纽约）的中国人。不是什么组织、不是什么品牌，就是一群觉得"在美国交到好朋友好难"的人，决定自己想想办法。',
      '',
      '办法很简单：去别人家里坐坐。',
      '',
      '一开始是几个人约着看电影，后来有人说"下次来我家吧，我做饭"，再后来有人带了新朋友来，新朋友又带了新朋友……就这样，串门儿慢慢长大了。',
      '',
      '我们做过的事情：',
      '• 在某人客厅里看了一部伯格曼的电影，看完聊到凌晨两点',
      '• 每人带一道菜的 Potluck，桌上摆满了各路家乡菜',
      '• 周末去爬山，爬完在停车场吃西瓜',
      '• 下雨天在家打桌游，玩到谁也不想走',
      '',
      '没什么门槛——不需要你很外向、很会社交、或者认识任何人。你只需要愿意来，愿意留下来聊聊。',
      '',
      '如果你正好也住在这一带，也想认识几个真实的、不端着的朋友，欢迎来串门。',
      '',
      '真的，来就是了。',
      '',
      '串门儿',
    ],
  },
  about: {
    title: '关于我们',
    body: [
      '【串门儿是什么】',
      '串门儿是一个扎根在新泽西的中文社区。我们通过小型线下聚会，帮助在美华人认识彼此、建立友谊。',
      '',
      '这里没有社交压力，没有商业目的，没有 KPI。就是一群人，愿意打开自己的家门，请别人来坐坐。',
      '',
      '【怎么开始的】',
      '2024 年初，几个住在 Edison 的朋友觉得：在美国生活挺好的，但好像少了那种"随时串门"的感觉。于是我们开始约人来家里看电影。',
      '',
      '第一次来了 5 个人。第二次来了 8 个。后来有人说："下次来我家吧。" 再后来，越来越多的客厅加入了进来。',
      '',
      '串门儿这个名字，就是这么来的——去别人家坐坐，不需要理由。',
      '',
      '【现在的我们】',
      '从几个人到几十个人，从 Edison 到整个新泽西（偶尔到纽约），串门儿的朋友们散布在各个角落。我们做的事情也从看电影拓展到了 Potluck、桌游、徒步、咖啡闲聊、读书会……',
      '',
      '但不管怎么变，初心没变：交到真朋友。',
      '',
      '【运营团队】',
      '串门儿没有公司、没有投资、没有全职员工。平台和活动都由成员自愿运营维护。如果你有任何问题、建议或想参与运营，欢迎联系我们。',
      '',
      '📧 hi@chuanmener.club',
    ],
  },
  legal: {
    title: '免责声明与隐私政策',
    body: [
      '【免责声明】',
      '串门儿（ChuanMen）是非营利性社区活动组织平台，旨在促进社区成员之间的社交联系。本平台不提供任何商业服务，不收取活动参与费用（AA 制费用由参与者之间自行协商）。',
      '活动安全：所有线下活动均由成员自愿发起和参加。串门儿不对活动过程中发生的人身伤害、财产损失或任何意外事件承担责任。参与者应自行评估活动风险并对自身安全负责。',
      'Host 责任：活动 Host 自愿提供场地和组织服务，串门儿不对 Host 的场地条件、食品安全或其他 Host 行为承担任何责任。',
      '第三方内容：用户在平台上发布的内容（包括电影推荐、活动描述、感谢卡等）仅代表个人观点，不代表串门儿的立场。',
      '【隐私政策】',
      '信息收集：我们收集您注册时提供的基本信息（姓名、邮箱、位置）以及您在平台上的活动记录（参加活动、推荐电影、发送感谢卡等）。',
      '信息使用：您的信息仅用于平台功能运行、活动组织和社区互动。我们不会将您的个人信息出售或分享给任何第三方用于商业目的。',
      '信息展示：您的姓名、位置、Bio 等个人资料对社区成员可见。您可以在设置中选择隐藏邮箱地址。感谢卡可设置为"仅彼此可见"。',
      '数据存储：您的数据存储在安全的服务器上。我们采取合理的技术措施保护您的个人信息安全。',
      '账号注销：您可以随时联系运营团队申请注销账号和删除个人数据。',
      '【联系我们】',
      '如有任何问题或疑虑，请联系串门儿运营团队：cm@gmail.com',
      '本声明最后更新日期：2026 年 2 月。',
    ],
  },
};

/** Convert static body array to simple HTML paragraphs */
function staticToHtml(body: string[]): string {
  return body
    .map((line) => (line.trim() === '' ? '' : `<p>${line}</p>`))
    .join('\n');
}

/** Convert static markdown to HTML */
function staticMdToHtml(md: string): string {
  return marked.parse(md) as string;
}

export default function AboutContentPage() {
  const { contentType } = useParams();
  const [apiData, setApiData] = useState<{ title: string; content: string } | null>(null);

  useEffect(() => {
    if (!contentType) return;
    fetchAboutContentApi(contentType)
      .then((res: any) => {
        const data = Array.isArray(res) ? res[0] : res;
        if (data?.content) {
          setApiData({ title: data.title ?? contentType, content: data.content });
        }
      })
      .catch(() => {});
  }, [contentType]);

  const result = useMemo(() => {
    if (!contentType) return null;
    // API (DB) content takes priority — render as markdown
    if (apiData) {
      return { title: apiData.title, html: marked.parse(normalizeContent(apiData.content)) as string };
    }
    // Static fallback — render as markdown or plain HTML paragraphs
    const s = staticContent[contentType];
    if (s) {
      const html = s.md ? staticMdToHtml(s.md) : staticToHtml(s.body!);
      return { title: s.title, html };
    }
    return null;
  }, [contentType, apiData]);

  if (!result) {
    return <Typography color="text.secondary">未找到对应内容</Typography>;
  }

  const banner = contentType ? bannerConfig[contentType] : undefined;

  return (
    <Card>
      {banner && (
        <Box
          sx={{
            position: 'relative',
            height: 80,
            overflow: 'hidden',
            borderRadius: 'inherit',
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            background: `${banner.glows.join(',')}, ${banner.base}`,
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              opacity: 0.1,
              mixBlendMode: 'screen',
              backgroundImage: grainSvg,
              backgroundSize: '128px 128px',
            }}
          />
        </Box>
      )}
      <CardContent>
        <RichTextViewer html={result.html} />
      </CardContent>
    </Card>
  );
}
