const { v4: uuidv4 } = require("uuid");
const mongoose = require("mongoose");
const { validationResult } = require("express-validator");

const HttpError = require("../models/http-error");
const getCoordsForAddress = require("../utils/location");
const Place = require("../models/place");
const User = require("../models/user");

const getPlaceById = async (req, res, next) => {
  const placeId = req.params.pid;
  let place;
  let id;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, could not find place",
      500
    );
    return next(error);
  }

  if (!place) {
    const error = new HttpError(
      "Could not find a place for the provided id.",
      404
    );
    return next(error);
  }

  res.json({ place });
};

const getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid;
  let places;
  // let userWithPlaces;
  try {
    // userWithPlaces = await User.findById("userId").populate("places");
    places = await Place.find({ creator: userId });
  } catch (err) {
    const error = new HttpError("Fetching place failed, try again later.", 500);
    return next(error);
  }

  if (!places || places.length === 0) {
    // if (!userWithPlaces || userWithPlaces.length === 0) {
    return next(
      new HttpError("Could not find a places for the provided user id.", 404)
    );
  }

  res.json({ places });
};

const createPlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError("Invalid inputs passed.", 422));
  }

  const { title, description, address } = req.body;

  let coordinates;
  try {
    coordinates = await getCoordsForAddress(address);
  } catch (error) {
    return next(error);
  }

  const createdPlace = new Place({
    title,
    description,
    address,
    location: coordinates,
    image:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRZXomn4P8EXSe1QvO0P5jI_J7AHtOkXSPJJ2sX1QHwj8BgBUa8Sw&s",
    creator: req.userData.userId,
  });

  let user;
  try {
    user = await User.findById(req.userData.userId);
  } catch (err) {
    return next(new HttpError("Creating place failed", 500));
  }

  if (!user) {
    return next(new HttpError("Could not find the provided user", 500));
  }

  console.log(user);

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdPlace.save({ session: sess });
    user.places.push(createdPlace);
    await user.save({ session: sess });
    await sess.commitTransaction();
  } catch {
    const error = new HttpError("Creating place failed", 500);
    return next(error);
  }
  res.status(201).json({ place: createdPlace });
};

const updatePlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError("Invalid inputs passed.", 422));
  }

  const { title, description } = req.body;
  const placeId = req.params.pid;

  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError("Something went wrong, unable to update.", 500);
    return next(error);
  }

  if (place.creator.toString() !== req.userData.userId) {
    const error = new HttpError(
      "Your are not allowed to edit this place.",
      401
    );
    return next(error);
  }

  place.title = title;
  place.description = description;

  try {
    await place.save();
  } catch (err) {
    const error = new HttpError("Something went wrong, unable to update.", 500);
    return next(error);
  }

  res.status(200).json({ place });
};

const deletePlace = async (req, res, next) => {
  const placeId = req.params.pid;
  let place;
  try {
    place = await (await Place.findById(placeId)).populate("creator");
  } catch (err) {
    const error = new HttpError("Something went wrong, unable to delete.", 500);
    return next(error);
  }

  if (!place) {
    return next(new HttpError("Could not find place for this id", 404));
  }

  if (place.creator.id !== req.userData.userId) {
    return next(
      new HttpError("You are not allowed to delete this place.", 401)
    );
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await place.remove({ session: sess });
    place.creator.places.pull(place);
    await place.creator.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError("Something went wrong, unable to delete.", 500);
    return next(error);
  }

  res.status(200).json({ message: "Deleted place" });
};

exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;
