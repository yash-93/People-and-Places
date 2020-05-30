const { v4: uuidv4 } = require("uuid");
const { validationResult } = require("express-validator");

const HttpError = require("../models/http-error");
const getCoordsForAddress = require("../utils/location");
const Place = require("../models/place");

let DUMMY_PLACES = [
  {
    id: "p1",
    title: "Empire State Building",
    description: "One of the most famous sky scrapers in the world!",
    location: {
      lat: 40.7484474,
      lng: -73.9871516,
    },
    address: "20 W 34th St, New York, NY 10001",
    creator: "u1",
  },
];

const getPlaceById = async (req, res, next) => {
  const placeId = req.params.pid; // { pid: 'p1' }
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

  res.json({ place }); // => { place } => { place: place }
};

// function getPlaceById() { ... }
// const getPlaceById = function() { ... }

const getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid;
  let places;
  try {
    places = await Place.find({ creator: userId });
  } catch (err) {
    const error = new HttpError("Fetching place failed, try again later.", 500);
    return next(error);
  }

  if (!places || places.length === 0) {
    return next(
      new HttpError("Could not find a places for the provided user id.", 404)
    );
  }

  res.json({ places });
};

const createPlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // console.log(errors);
    return next(new HttpError("Invalid inputs passed.", 422));
  }

  const { title, description, address, creator } = req.body;

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
    creator,
  });

  try {
    await createdPlace.save();
  } catch {
    const error = new HttpError("Creating place failed", 500);
    return next(error);
  }
  res.status(201).json({ place: createdPlace });
};

const updatePlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new HttpError("Invalid inputs passed.", 422);
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

const deletePlace = (req, res, next) => {
  const placeId = req.params.pid;
  if (!DUMMY_PLACES.find((p) => p.id === placeId)) {
    throw new HttpError(
      "Place does not exist with givenid, Nothing to delete.",
      422
    );
  }
  DUMMY_PLACES = DUMMY_PLACES.filter((p) => p.id !== placeId);
  res.status(200).json({ message: "Deleted place" });
};

exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;
