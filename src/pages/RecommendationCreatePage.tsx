import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useAuth } from '@/auth/AuthContext';
import { createRecommendation, type RecommendationCategory } from '@/lib/domainApi';
import { ImageUpload } from '@/components/ImageUpload';

const categoryMap: Record<RecommendationCategory, string> = {
  movie: '电影',
  recipe: '菜谱',
  music: '音乐',
  place: '好店',
};

function isCategory(value: string | undefined): value is RecommendationCategory {
  return value === 'movie' || value === 'recipe' || value === 'music' || value === 'place';
}

/* ── Mock Douban data for demo ── */
const doubanMock: Record<string, { title: string; year: string; director: string; genre: string; rating: string; synopsis: string }> = {
  '1291557': { title: '花样年华', year: '2000', director: '王家卫', genre: '剧情,爱情', rating: '8.6', synopsis: '1962年的香港，报社编辑周慕云与苏丽珍成为邻居。当他们发现各自的配偶背着他们有了婚外情后，两人开始互相接近，在克制与暧昧之间徘徊。' },
  '1291999': { title: '重庆森林', year: '1994', director: '王家卫', genre: '剧情,爱情', rating: '8.7', synopsis: '两段发生在重庆大厦和兰桂坊附近的都市爱情故事。失恋警察与神秘女杀手的一夜邂逅，以及另一个警察与快餐店女孩间的错过与重逢。' },
  '27010768': { title: '寄生虫', year: '2019', director: '奉俊昊', genre: '剧情,喜剧,惊悚', rating: '8.8', synopsis: '金家四口全是无业游民，一次偶然的机会让长子基宇进入朴社长的豪宅当家教。随后一家人逐一渗透进这个富裕家庭。' },
  '1291561': { title: '千与千寻', year: '2001', director: '宫崎骏', genre: '动画,奇幻,冒险', rating: '9.4', synopsis: '少女千寻随父母误入神灵世界，父母因贪吃被变成猪。千寻在汤婆婆的澡堂中工作，在这个奇异的世界中找到了勇气和成长。' },
  '30257175': { title: '燃烧女子的肖像', year: '2019', director: '瑟琳·席安玛', genre: '剧情,爱情', rating: '8.6', synopsis: '18世纪的法国，年轻女画家玛丽安受委托为富家小姐爱洛伊兹画肖像。在孤岛上相处的日子里，两人之间的目光渐渐化为爱意。' },
  '27622447': { title: '小偷家族', year: '2018', director: '是枝裕和', genre: '剧情,家庭,犯罪', rating: '8.7', synopsis: '东京底层，一家人靠偷窃为生却相互依存。当他们捡回一个被虐待的小女孩后，这个"家族"的秘密开始逐渐浮出水面。' },
  '35942138': { title: '坠落的审判', year: '2023', director: '茹斯汀·特里耶', genre: '剧情,悬疑', rating: '8.4', synopsis: '丈夫从阁楼坠亡，作家妻子成为嫌疑人。法庭上，婚姻中的每一个裂缝都被放大审视。' },
  '36151692': { title: '完美的日子', year: '2023', director: '维姆·文德斯', genre: '剧情', rating: '8.3', synopsis: '东京，平山每天清晨起床，去清扫公共厕所。他听磁带、读文库本、在树荫下吃三明治。每一天都一样，却每一天都不同。' },
  '1292052': { title: '东京物语', year: '1953', director: '小津安二郎', genre: '剧情,家庭', rating: '9.2', synopsis: '年迈的父母从乡下到东京探望已成家的子女，却发现孩子们各忙各的，无暇照顾他们。' },
  '1292365': { title: '春光乍泄', year: '1997', director: '王家卫', genre: '剧情,爱情,同性', rating: '8.9', synopsis: '黎耀辉和何宝荣从香港到布宜诺斯艾利斯，在异国的颠沛流离中反复纠缠、分离、重逢。' },
  '1293182': { title: '惊魂记', year: '1960', director: '阿尔弗雷德·希区柯克', genre: '悬疑,惊悚,恐怖', rating: '8.9', synopsis: '玛丽恩携款潜逃，途中投宿于一家偏僻的汽车旅馆，旅馆主人诺曼·贝茨看似温和有礼，但在他和母亲的关系中隐藏着惊人的秘密。' },
  '1296736': { title: '大佛普拉斯', year: '2017', director: '黄信尧', genre: '剧情,喜剧', rating: '8.4', synopsis: '在佛像工厂当夜班保安的菜脯，和拾荒的好友肚财偷看老板的行车记录仪，却意外发现了惊天秘密。' },
  '3011091': { title: '四月物语', year: '1998', director: '岩井俊二', genre: '剧情,爱情', rating: '8.3', synopsis: '大学新生卯月怀着暗恋的心意来到东京，住进小小的公寓，开始新生活。春天的樱花与雨伞，一个女孩安静的暗恋日常。' },
  '26752088': { title: '海边的曼彻斯特', year: '2016', director: '肯尼思·洛纳根', genre: '剧情,家庭', rating: '8.6', synopsis: '李因为哥哥去世而回到家乡曼彻斯特，被指定为侄子的监护人。但这个沉默寡言的男人有着无法释怀的过去。' },
};

/** Extract Douban subject ID from URL */
function parseDoubanId(url: string): string | null {
  const m = url.match(/movie\.douban\.com\/subject\/(\d+)/);
  return m ? m[1] : null;
}

export default function RecommendationCreatePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { category } = useParams();
  const currentCategory = isCategory(category) ? category : 'movie';
  const categoryName = useMemo(() => categoryMap[currentCategory], [currentCategory]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Douban auto-fill state
  const [fetching, setFetching] = useState(false);
  const [fetched, setFetched] = useState(false);
  const fetchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
    }
  }, [navigate, user]);

  if (!user) {
    return null;
  }

  const isMovie = currentCategory === 'movie';

  /** Handle sourceUrl changes — detect Douban link and auto-fill */
  const handleUrlChange = (value: string) => {
    setSourceUrl(value);
    if (!isMovie) return;

    // Clear previous timer
    if (fetchTimer.current) clearTimeout(fetchTimer.current);

    const doubanId = parseDoubanId(value);
    if (!doubanId) {
      setFetched(false);
      return;
    }

    // Simulate fetch with delay
    setFetching(true);
    setFetched(false);
    fetchTimer.current = setTimeout(() => {
      const data = doubanMock[doubanId];
      if (data) {
        setTitle(data.title);
        setDescription(`${data.director} ${data.year}｜${data.synopsis}`);
        setTagsText(data.genre);
      } else {
        // Unknown ID — still show fetched state with partial info
        setTitle('');
        setDescription('');
        setTagsText('');
      }
      setFetching(false);
      setFetched(!!data);
    }, 800);
  };

  /** Handle paste — detect Douban link immediately */
  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text');
    if (isMovie && parseDoubanId(pasted)) {
      // Let the onChange fire first, then trigger fetch
      setTimeout(() => handleUrlChange(pasted), 0);
    }
  };

  const onSubmit = async () => {
    if (!user?.id) {
      setError('请先登录后再发布推荐');
      return;
    }
    if (!title.trim()) {
      setError(`请填写${categoryName}标题`);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const tags = tagsText
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);

      const recommendation = await createRecommendation({
        category: currentCategory,
        title: title.trim(),
        description: description.trim(),
        sourceUrl: sourceUrl.trim(),
        coverUrl: coverUrl || undefined,
        tags,
        authorId: user.id,
      });

      navigate(`/discover/${currentCategory}/${String(recommendation._id)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '发布失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h5" fontWeight={700}>添加{categoryName}</Typography>
          {error && <Alert severity="error">{error}</Alert>}

          {/* Douban URL field for movies — prominent position */}
          {isMovie && (
            <Box>
              <TextField
                label="豆瓣链接"
                placeholder="粘贴豆瓣电影链接，自动填充信息"
                value={sourceUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                onPaste={handlePaste}
                fullWidth
                slotProps={{
                  input: {
                    endAdornment: fetching ? (
                      <CircularProgress size={20} />
                    ) : fetched ? (
                      <Chip size="small" color="success" label="已获取" />
                    ) : null,
                  },
                }}
              />
              {!sourceUrl && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  例如：https://movie.douban.com/subject/1291557/
                </Typography>
              )}
              {fetching && (
                <Typography variant="caption" color="primary" sx={{ mt: 0.5, display: 'block' }}>
                  正在从豆瓣获取电影信息...
                </Typography>
              )}
            </Box>
          )}

          <TextField label="标题" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth />
          <TextField label="描述" value={description} onChange={(e) => setDescription(e.target.value)} multiline minRows={4} fullWidth />

          {/* Non-movie categories still have the generic link field */}
          {!isMovie && (
            <TextField label="链接（可选）" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} fullWidth />
          )}

          <TextField label="标签（逗号分隔）" value={tagsText} onChange={(e) => setTagsText(e.target.value)} fullWidth />

          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>封面图（可选）</Typography>
            <ImageUpload
              value={coverUrl}
              onChange={setCoverUrl}
              category="recommendation"
              ownerId={user.id}
              width="100%"
              height={160}
              shape="rect"
              maxSize={10 * 1024 * 1024}
            />
          </Box>

          <Button variant="contained" onClick={onSubmit} disabled={submitting}>
            {submitting ? '提交中...' : '发布推荐'}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
