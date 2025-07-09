import createError from 'http-errors';
import express from 'express';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import dotenv from 'dotenv';

// routes
import indexRouter from './routes/index.js';
import seederRouter from './routes/seeders.js';
import recomendationRouter from './routes/recomendation_system.js';
import address from './routes/address.js'
import sub_address from './routes/sub_address.js'

dotenv.config();

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.set('view engine', 'pug')

app.use('/', indexRouter);
app.use('/seeders', seederRouter);
app.use('/recomendation_system', recomendationRouter);
app.use('/address', address);
app.use('/sub_address', sub_address);

// catch 404 and forward to error handler
app.use((req, res, next) => {
    next(createError(404));
});

// error handler
app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

export default app; 
