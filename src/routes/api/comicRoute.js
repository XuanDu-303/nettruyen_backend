const express = require("express");
const router = express.Router();

const { bulkUpdateChapters, getMetricsBySlug, toggleFollowComic, incViewsComic, getTopComics, incViewsChapter, bulkUpdateComics } = require('../../controllers/comicCtrl.js');
const { authMiddleware } = require("../../middlewares/authMiddleware")

// router.get('/', getAllComic);
router.post('/bulk-update/chapters', bulkUpdateChapters);
router.post('/bulk-update/comics', bulkUpdateComics);
router.post('/view-comic/:slug', incViewsComic )
router.post('/view-chapter/:id', incViewsChapter )
router.put('/follow', authMiddleware, toggleFollowComic);
// router.get('/views', getViewsComics);
router.get('/top-comics', getTopComics);
// router.get('/', getAllComic);
router.get('/metrics/:slug', getMetricsBySlug );

module.exports = router;