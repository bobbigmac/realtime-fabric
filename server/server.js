
// Publish complete set of lists to all clients.
Meteor.publish('rooms', function() {
  return Rooms.find({});
});

// Publish all shapes for requested room_id.
Meteor.publish('objects', function (room_id) {
  return Objects.find({room_id: room_id});
});

// code to run on server at startup
Meteor.startup(function() {

});

Rooms.allow({
  insert: function (userId, doc) {
    return true;
  },
  update: function (userId, doc, fieldNames, modifier) {
  	return true;
  },
  remove: function (userId, doc) {
  	return true;
  }
});

Objects.allow({
  insert: function (userId, doc) {
    return true;
  },
  update: function (userId, doc, fieldNames, modifier) {
  	return true;
  },
  remove: function (userId, doc) {
  	return true;
  },
  fetch: ['room_id']
});