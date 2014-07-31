
Session.setDefault('room_id', null);

Meteor.subscribe('rooms', function() {
  var room;
  var room_id = Session.get('room_id');

  if (room_id == null) {
    room = Rooms.findOne({}, {
      sort: {
        name: 1
      }
    });
    if (room != null) {
      return Router.set_room(room._id);
    }
  }
});

Meteor.autosubscribe(function() {
  var room_id = Session.get('room_id');
  if (room_id != null) {
    return Meteor.subscribe('objects', room_id);
  }
});

var okcancel_events = function(sel) {
  return "keyup " + sel + ", keydown " + sel + ", focusout " + sel;
};

var make_okcancel_handler = function(options) {
  var cancel, ok;
  ok = options.ok || function() {};
  cancel = options.cancel || function() {};
  return function(evt) {
    var value;
    if (evt.type === "keydown" && evt.which === 27) {
      return cancel.call(this, evt);
    } else if (evt.type === "keyup" && evt.which === 13 || evt.type === "focusout") {
      value = String(evt.target.value || "");
      if (value != null) {
        return ok.call(this, value, evt);
      } else {
        return cancel.call(this, evt);
      }
    }
  };
};

Template.rooms.rooms = function() {
  rooms = Rooms.find({}, {
    sort: {
      name: 1
    }
  });
  return rooms;
};

Template.rooms.events = {};

Template.rooms.events[okcancel_events('#new-room')] = make_okcancel_handler({
  ok: function(text, evt) {
    var id;
    text = $.trim(text);
    if (text === "") {
      return;
    }
    id = Rooms.insert({
      name: text
    });
    Router.set_room(id);
    return evt.target.value = "";
  }
});

Template.room.selected = function() {
  if (Session.equals('room_id', this._id)) {
    return 'selected';
  } else {
    return '';
  }
};

Template.room.events = {
  'mousedown': function(evt) {
    return Router.set_room(this._id);
  }
};

Template.objects.any_room_selected = function() {
  return !Session.equals('room_id', null);
};

Template.objects.objects = function() {
  var room_id = Session.get('room_id');
  return Objects.find({ room_id: room_id }, { sort: { timestamp: 1 } });
};

Template.objects.object = function() {
  var obj;
  window.canvas.forEachObject((function(_this) {
    return function(obj) {
      if (obj.mongoid === _this._id) {
        return window.canvas.remove(obj);
      }
    };
  })(this));
  
  function add_canvas_obj(obj) {
    if(this.obj_type == 'itext')
    {
      obj.on("text:changed", function() {
        obj.on("editing:exited", function() {
          on_object_modified({target: obj});
          obj.off("editing:exited");
        });
        obj.off("text:changed");
      });
    }

    obj.fill = this.fill;
    obj.setAngle(this.angle);
    obj.originX = 'center';
    obj.originY = 'center';
    obj.left = this.left;
    obj.top = this.top;
    obj.mongoid = this._id;
    obj.obj_type = this.obj_type;
    obj.zPos = this.zPos;

    window.canvas.add(obj);
    if(this.zPos)
    {
      window.canvas.moveTo(obj, this.zPos);
    }
  }

  obj = (function() {
    //TODO: Could tweak this to return existing (and not remove them above)
    switch (this.obj_type) {
      case "rect":
        return new fabric.Rect({
          width: this.width,
          height: this.height
        });
      case "triangle":
        return new fabric.Triangle({
          width: this.width,
          height: this.height
        });
      case "circle":
        return new fabric.Circle({
          radius: this.width,
          scaleX: this.scaleX,
          scaleY: this.scaleY
        });
      case "itext":
        return new fabric.IText(this.text || 'Text', {
          width: this.width,
          height: this.height,
          fontFamily: 'helvetica,arial,sans',
          scaleX: this.scaleX||1,
          scaleY: this.scaleY||1
        });
      case "svg":
        if(this.svgxml)
        {
          var self = this;
          fabric.loadSVGFromString(this.svgxml, function(objects, options) {
            obj = fabric.util.groupSVGElements(objects, options);
            obj.scaleX = self.scaleX||1;
            obj.scaleY = self.scaleY||1;
            add_canvas_obj.call(self, obj);
          });
        }
        else
        {
          //console.log('no svgxml for an image', this._id);
        }
        return false;
    }
  }).call(this);

  if(obj)
  {
    add_canvas_obj.call(this, obj);
  }

  return "";
};

var add_fabric_thing = function(obj_type, svgName, svgString) {
  var data;
  data = {
    room_id: Session.get('room_id'),
    obj_type: obj_type,
    timestamp: (new Date()).getTime(),
    left: random_range(30, 700),
    top: random_range(30, 250),
    width: random_range(30, 70),
    height: random_range(30, 70),
    scaleX: 1,
    scaleY: 1,
    angle: 0,
  };
  if (obj_type === "rect" || obj_type === "triangle" || obj_type === "circle" || obj_type === "itext") {
    data.fill = "rgb(" + (random_range(70, 200)) + "," + (random_range(70, 200)) + "," + (random_range(70, 200)) + ")";
    if (obj_type === "itext") {
      data.text = 'Text';
    }
    if (obj_type === "circle") {
      data.scaleX = 0.5;
      data.scaleY = 0.5;
    }
  }
  if (obj_type === "svg") {
    data.svgfilename = svgName;
    data.svgxml = svgString;
  }
  return Objects.insert(data);
};

var on_object_modified = function(memo) {
  var data, target;
  target = memo.target;
  var allObjects = window.canvas.getObjects();
  var zPos = allObjects.length;//allObjects.indexOf(target);

  data = {
    top: target.top,
    left: target.left,
    angle: target.getAngle(),
    zPos: zPos,
  };
  if (target.obj_type === "itext") {
    data.text = target.text;
    //TODO: Get style
  }
  if (target.obj_type === "circle" || target.obj_type === "itext" || target.obj_type === "svg") {
    data.scaleX = target.scaleX;
    data.scaleY = target.scaleY;
  } else {
    data.width = target.getWidth();
    data.height = target.getHeight();
  }
  return Objects.update(target.mongoid, {
    $set: data
  });
};

var loadLocalFile = function(file, cb) {
  if ( file.type.indexOf("image/svg") == 0 ) { 
    var reader = new FileReader(); 
    reader.onload = function(e) { 
      cb(file.name, e.target.result); 
    }
    //reader.readAsDataURL(file);
    reader.readAsText(file); 
  }
  else
  {
    console.log('invalid file type');
  }
}

_.extend(Template.canvas, {
  events: {
    'change .btn-file :file': function(e, template) {
      var target = e.currentTarget||e.target;
      var files = target.files || e.dataTransfer.files;
      for ( var i = 0, f; f = files[i]; i++ ) {
        loadLocalFile(f, function(fileName, fileString) {
          add_fabric_thing('svg', fileName, fileString);
        });
      }
    },
    'click .add-shape': function(e) {
      var target = e.currentTarget||e.target;
      return add_fabric_thing($(target).data("shape"));
    }
  }
});

RoomsRouter = Backbone.Router.extend({
  routes: {
    ":room_id": "main"
  },
  main: function(room_id) {
    window.canvas.clear();
    return Session.set("room_id", room_id);
  },
  set_room: function(room_id) {
    return this.navigate(room_id, true);
  }
});

Router = new RoomsRouter;

Meteor.startup(function() {
  window.canvas = new fabric.Canvas('c');
  window.canvas.observe("object:modified", on_object_modified);
  /*window.canvas.observe('text:changed', function(e) {//Prob need to upgrade fabric for this to work
    console.log('text:changed', e.target, e);
  });*/
  return Backbone.history.start({
    pushState: true
  });
});