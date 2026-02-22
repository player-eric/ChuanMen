import { Router } from 'express';
import {
	AboutContentModel,
	AgentPushModel,
	CommentModel,
	DiscussionModel,
	DiscussionReplyModel,
	EventModel,
	EventSignupModel,
	ExperimentPairingModel,
	LikeModel,
	MediaAssetModel,
	MovieModel,
	MovieVoteModel,
	PostcardModel,
	ProposalModel,
	ProposalVoteModel,
	RecommendationModel,
	SeedCollaboratorModel,
	SeedModel,
	SeedUpdateModel,
	UserPreferenceModel,
	WeeklyLotteryModel,
} from '../models/index.js';
import { authRouter } from './auth.js';
import { createCrudRouter } from './crud.js';
import { healthRouter } from './health.js';
import { mediaRouter } from './media.js';
import { searchRouter } from './search.js';
import { usersRouter } from './users.js';

const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/media', mediaRouter);
apiRouter.use('/search', searchRouter);

apiRouter.use('/events', createCrudRouter(EventModel, { defaultSortBy: 'startsAt' }));
apiRouter.use('/event-signups', createCrudRouter(EventSignupModel));
apiRouter.use('/movies', createCrudRouter(MovieModel));
apiRouter.use('/movie-votes', createCrudRouter(MovieVoteModel));
apiRouter.use('/proposals', createCrudRouter(ProposalModel));
apiRouter.use('/proposal-votes', createCrudRouter(ProposalVoteModel));
apiRouter.use('/postcards', createCrudRouter(PostcardModel));
apiRouter.use('/seeds', createCrudRouter(SeedModel));
apiRouter.use('/seed-collaborators', createCrudRouter(SeedCollaboratorModel));
apiRouter.use('/seed-updates', createCrudRouter(SeedUpdateModel));
apiRouter.use('/discussions', createCrudRouter(DiscussionModel));
apiRouter.use('/discussion-replies', createCrudRouter(DiscussionReplyModel));
apiRouter.use('/likes', createCrudRouter(LikeModel));
apiRouter.use('/comments', createCrudRouter(CommentModel));
apiRouter.use('/about-content', createCrudRouter(AboutContentModel));
apiRouter.use('/weekly-lottery', createCrudRouter(WeeklyLotteryModel));
apiRouter.use('/experiment-pairings', createCrudRouter(ExperimentPairingModel));
apiRouter.use('/agent-pushes', createCrudRouter(AgentPushModel));
apiRouter.use('/user-preferences', createCrudRouter(UserPreferenceModel));
apiRouter.use('/media-assets', createCrudRouter(MediaAssetModel));
apiRouter.use('/recommendations', createCrudRouter(RecommendationModel));

export { apiRouter };
