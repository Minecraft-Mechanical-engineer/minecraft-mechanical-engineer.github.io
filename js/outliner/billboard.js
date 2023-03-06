class BillboardFace extends Face {
	constructor(data, billboard) {
		super();
		this.texture = false;
		this.billboard = billboard;
		this.uv = [0, 0, canvasGridSize(), canvasGridSize()]
		this.rotation = 0;

		if (data) {
			this.extend(data)
		}
	}
	get uv_size() {
		return [
			this.uv[2] - this.uv[0],
			this.uv[3] - this.uv[1]
		]
	}
	set uv_size(arr) {
		this.uv[2] = arr[0] + this.uv[0];
		this.uv[3] = arr[1] + this.uv[1];
	}
	extend(data) {
		super.extend(data);
		if (data.uv) {
			Merge.number(this.uv, data.uv, 0)
			Merge.number(this.uv, data.uv, 1)
			Merge.number(this.uv, data.uv, 2)
			Merge.number(this.uv, data.uv, 3)
		}
		return this;
	}
	reset() {
		super.reset();
		this.rotation = 0;
		return this;
	}
	getBoundingRect() {
		return getRectangle(...this.uv);
	}
}
new Property(BillboardFace, 'number', 'rotation', {default: 0});


class Billboard extends OutlinerElement {
	constructor(data, uuid) {
		super(data, uuid)
		let size = Settings.get('default_cube_size');
		this.position = [0, 0, 0];
		this.to = [size, size];
		this.shade = true;
		this.mirror_uv = false;
		this.color = Math.floor(Math.random()*markerColors.length)
		this.visibility = true;
		this.autouv = 0;

		for (var key in Billboard.properties) {
			Billboard.properties[key].reset(this);
		}

		this.box_uv = Project.box_uv;
		this.faces = {
			front: 	new BillboardFace(null, this),
		}
		if (data && typeof data === 'object') {
			this.extend(data)
		}
	}
	extend(object) {
		for (var key in Billboard.properties) {
			Billboard.properties[key].merge(this, object)
		}

		this.sanitizeName();
		if (object.size) {
			if (typeof object.size[0] == 'number' && !isNaN(object.size[0])) this.to[0] = this.from[0] + object.size[0]
			if (typeof object.size[1] == 'number' && !isNaN(object.size[1])) this.to[1] = this.from[1] + object.size[1]
			if (typeof object.size[2] == 'number' && !isNaN(object.size[2])) this.to[2] = this.from[2] + object.size[2]
		}
		if (object.uv_offset) {
			Merge.number(this.uv_offset, object.uv_offset, 0)
			Merge.number(this.uv_offset, object.uv_offset, 1)
		}
		if (typeof object.rotation === 'object' && object.rotation.constructor.name === 'Object') {
			if (object.rotation.angle && object.rotation.axis) {
				let axis = getAxisNumber(object.rotation.axis)
				if (axis >= 0) {
					this.rotation.V3_set(0)
					this.rotation[axis] = object.rotation.angle
				}
			}
			if (object.rotation.origin) {
				Merge.number(this.origin, object.rotation.origin, 0)
				Merge.number(this.origin, object.rotation.origin, 1)
				Merge.number(this.origin, object.rotation.origin, 2)
			}
			Merge.boolean(this, object.rotation, 'rescale')
			if (typeof object.rotation.axis === 'string') {
				this.rotation_axis = object.rotation.axis
			}
		} else if (object.rotation) {
			Merge.number(this.rotation, object.rotation, 0)
			Merge.number(this.rotation, object.rotation, 1)
			Merge.number(this.rotation, object.rotation, 2)
		}
		if (object.faces) {
			for (var face in this.faces) {
				if (this.faces.hasOwnProperty(face) && object.faces.hasOwnProperty(face)) {
					this.faces[face].extend(object.faces[face])
				}
			}
		}
		return this;
	}
	init() {
		super.init();
		if (Format.single_texture && Texture.getDefault()) {
			this.faces.front.texture = Texture.getDefault().uuid;
		}
		return this;
	}
	size(axis, floored) {
		let scope = this;
		let epsilon = 0.0000001;
		function getA(axis) {
			if (floored == true) {
				return Math.floor(scope.to[axis] - scope.from[axis] + epsilon);

			} else if (floored == 'box_uv' && Format.box_uv_float_size != true) {
				return Math.floor(scope.to[axis] - scope.from[axis] + epsilon);

			} else {
				return scope.to[axis] - scope.from[axis]
			}
		}
		if (axis !== undefined) {
			return getA(axis);
		} else {
			return [
				getA(0),
				getA(1),
				getA(2)
			]
		}
	}
	rotationAxis() {
		for (var axis = 0; axis < 3; axis++) {
			if (this.rotation[axis] !== 0) {
				this.rotation_axis = getAxisLetter(axis);
				return this.rotation_axis;
			}
		}
		return this.rotation_axis;
	}
	getMesh() {
		return this.mesh;
	}
	get mesh() {
		return Project.nodes_3d[this.uuid];
	}
	getUndoCopy(aspects = 0) {
		let copy = new Billboard(this)
		if (aspects.uv_only) {
			copy = {
				box_uv: copy.box_uv,
				uv_offset: copy.uv_offset,
				faces: copy.faces,
				mirror_uv: copy.mirror_uv,
				autouv: copy.autouv,
			}
		}
		for (let face_id in copy.faces) {
			copy.faces[face_id] = copy.faces[face_id].getUndoCopy()
		}
		copy.uuid = this.uuid
		copy.type = this.type;
		delete copy.parent;
		return copy;
	}
	getSaveCopy(project) {
		let el = {}
		
		for (var key in Billboard.properties) {
			Billboard.properties[key].copy(this, el)
		}

		el.from = this.from;
		el.to = this.to;
		el.autouv = this.autouv;
		el.color = this.color;

		if (!this.visibility) el.visibility = false;
		if (!this.export) el.export = false;
		if (!this.shade) el.shade = false;
		if (this.mirror_uv) el.mirror_uv = true;
		if (this.inflate) el.inflate = this.inflate;
		if (!this.rotation.allEqual(0)) el.rotation = this.rotation;
		el.origin = this.origin;
		if (!this.uv_offset.allEqual(0)) el.uv_offset = this.uv_offset;
		el.faces = {
			front: this.faces.front.getSaveCopy(project)
		}
		el.type = this.type;
		el.uuid = this.uuid;
		return el;
	}
	roll(axis, steps, origin) {
		if (!origin) {origin = this.origin}
		function rotateCoord(array) {
			if (origin === undefined) {
				origin = [8, 8, 8]
			}
			let a, b;
			array.forEach(function(s, i) {
				if (i == axis) {
					//
				} else {
					if (a == undefined) {
						a = s - origin[i]
						b = i
					} else {
						array[b] = s - origin[i]
						array[b] = origin[b] - array[b]
						array[i] = origin[i] + a;
					}
				}
			})
			return array
		}

		// Check limits
		if (Format.cube_size_limiter && !settings.deactivate_size_limit.value) {
			let from = this.from.slice(), to = this.to.slice();
			for (let check_steps = steps; check_steps > 0; check_steps--) {
				switch(axis) {
					case 0: [from[2], to[2]] = [to[2], from[2]]; break;
					case 1: [from[2], to[2]] = [to[2], from[2]]; break;
					case 2: [from[1], to[1]] = [to[1], from[1]]; break;
				}
				from.V3_set(rotateCoord(from));
				to.V3_set(rotateCoord(to));
			}
			if (Format.cube_size_limiter.test(this, {from, to})) {
				return false;
			}
		}

		//Rotations
		let i = 0;
		let temp_rot = undefined;
		let temp_i = undefined;
		while (i < 3) {
			if (i !== axis) {
				if (temp_rot === undefined) {
					temp_rot = this.rotation[i]
					temp_i = i
				} else {
					this.rotation[temp_i] = -this.rotation[i]
					this.rotation[i] = temp_rot
				}
			}
			i++;
		}

		function rotateUVFace(number, iterations) {
			if (!number) number = 0;
			number += iterations * 90;
			return number % 360;
		}
		while (steps > 0) {
			steps--;
			//Swap coordinate thingy
			switch(axis) {
				case 0: [this.from[2], this.to[2]] = [this.to[2], this.from[2]]; break;
				case 1: [this.from[2], this.to[2]] = [this.to[2], this.from[2]]; break;
				case 2: [this.from[1], this.to[1]] = [this.to[1], this.from[1]]; break;
			}
			this.from.V3_set(rotateCoord(this.from))
			this.to.V3_set(rotateCoord(this.to))
			if (origin != this.origin) {
				this.origin.V3_set(rotateCoord(this.origin))
			}
			if (!this.box_uv) {
				if (axis === 0) {
					this.faces.west.rotation = rotateUVFace(this.faces.west.rotation, 1)
					this.faces.east.rotation = rotateUVFace(this.faces.east.rotation, 3)
					this.faces.north.rotation= rotateUVFace(this.faces.north.rotation, 2)
					this.faces.down.rotation = rotateUVFace(this.faces.down.rotation, 2)

					let temp = new BillboardFace(true, this.faces.north)
					this.faces.north.extend(this.faces.down)
					this.faces.down.extend(this.faces.south)
					this.faces.south.extend(this.faces.up)
					this.faces.up.extend(temp)

				} else if (axis === 1) {

					this.faces.up.rotation= rotateUVFace(this.faces.up.rotation, 1)
					this.faces.down.rotation = rotateUVFace(this.faces.down.rotation, 3)

					let temp = new BillboardFace(true, this.faces.north)
					this.faces.north.extend(this.faces.west)
					this.faces.west.extend(this.faces.south)
					this.faces.south.extend(this.faces.east)
					this.faces.east.extend(temp)

				} else if (axis === 2) {

					this.faces.north.rotation = rotateUVFace(this.faces.north.rotation, 1)
					this.faces.south.rotation= rotateUVFace(this.faces.south.rotation, 3)

					this.faces.up.rotation= rotateUVFace(this.faces.up.rotation, 3)
					this.faces.east.rotation= rotateUVFace(this.faces.east.rotation, 3)
					this.faces.west.rotation = rotateUVFace(this.faces.west.rotation, 3)
					this.faces.down.rotation = rotateUVFace(this.faces.down.rotation, 3)

					let temp = new BillboardFace(true, this.faces.east)
					this.faces.east.extend(this.faces.down)
					this.faces.down.extend(this.faces.west)
					this.faces.west.extend(this.faces.up)
					this.faces.up.extend(temp)
				}
			}
		}
		this.preview_controller.updateTransform(this);
		this.preview_controller.updateGeometry(this);
		this.preview_controller.updateFaces(this);
		this.preview_controller.updateUV(this);
		return this;
	}
	flip(axis) {
		var offset = this.position[axis] - center
		this.position[axis] = center - offset;
		// Name
		if (axis == 0 && this.name.includes('right')) {
			this.name = this.name.replace(/right/g, 'left').replace(/2$/, '');
		} else if (axis == 0 && this.name.includes('left')) {
			this.name = this.name.replace(/left/g, 'right').replace(/2$/, '');
		}
		this.createUniqueName();
		this.preview_controller.updateTransform(this);
		return this;
	}
	getWorldCenter() {
		var pos = Reusable.vec1.set(0, 0, 0);
		var q = Reusable.quat1.set(0, 0, 0, 1);
		if (this.parent instanceof Group) {
			THREE.fastWorldPosition(this.parent.mesh, pos);
			this.parent.mesh.getWorldQuaternion(q);
			var offset2 = Reusable.vec2.fromArray(this.parent.origin).applyQuaternion(q);
			pos.sub(offset2);
		}
		var offset = Reusable.vec3.fromArray(this.position).applyQuaternion(q);
		pos.add(offset);

		return pos;
	}
	setColor(index) {
		this.color = index;
		if (this.visibility) {
			this.preview_controller.updateFaces(this);
		}
		return this;
	}
	applyTexture(texture) {
		let scope = this;
		let value = null
		if (texture) {
			value = texture.uuid
		} else if (texture === false || texture === null) {
			value = texture;
		}
		this.faces.front.texture = value;
		if (selected.indexOf(this) === 0) {
			UVEditor.loadData()
		}
		this.preview_controller.updateFaces(this);
		this.preview_controller.updateUV(this);
	}
	moveVector(arr, axis, update = true) {
		if (typeof arr == 'number') {
			let n = arr;
			arr = [0, 0, 0];
			arr[axis||0] = n;
		} else if (arr instanceof THREE.Vector3) {
			arr = arr.toArray();
		}
		let scope = this;
		let in_box = true;
		arr.forEach((val, i) => {

			let size = scope.size(i);
			val += scope.from[i];

			let val_before = val;
			if (Math.abs(val_before - val) >= 1e-4) in_box = false;
			val -= scope.from[i]

			scope.from[i] += val;
			scope.to[i] += val;
		})
		if (Format.cube_size_limiter && !settings.deactivate_size_limit.value) {
			Format.cube_size_limiter.move(this);
		}
		if (update) {
			this.mapAutoUV()
			this.preview_controller.updateTransform(this);
			this.preview_controller.updateGeometry(this);
		}
		TickUpdates.selection = true;
		return in_box;
	}
	resize(val, axis, negative, allow_negative, bidirectional) {
		let before = this.oldScale != undefined ? this.oldScale : this.size(axis);
		if (before instanceof Array) before = before[axis];
		let modify = val instanceof Function ? val : n => (n+val)

		if (bidirectional) {

			let center = this.oldCenter[axis] || 0;
			let difference = modify(before) - before;
			if (negative) difference *= -1;

			let from = center - (before/2) - difference;
			let to = center + (before/2) + difference;

			if (Format.integer_size) {
				from = Math.round(from-this.from[axis])+this.from[axis];
				to = Math.round(to-this.to[axis])+this.to[axis];
			}
			this.from[axis] = from;
			this.to[axis] = to;
			if (from > to && !(settings.negative_size.value || allow_negative)) {
				this.from[axis] = this.to[axis] = (from + to) / 2;
			}

		} else if (!negative) {
			let pos = this.from[axis] + modify(before);
			if (Format.integer_size) {
				pos = Math.round(pos-this.from[axis])+this.from[axis];
			}
			if (pos >= this.from[axis] || settings.negative_size.value || allow_negative) {
				this.to[axis] = pos;
			} else {
				this.to[axis] = this.from[axis];
			}
		} else {
			let pos = this.to[axis] + modify(-before);
			if (Format.integer_size) {
				pos = Math.round(pos-this.to[axis])+this.to[axis];
			}
			if (pos <= this.to[axis] || settings.negative_size.value || allow_negative) {
				this.from[axis] = pos;
			} else {
				this.from[axis] = this.to[axis];
			}
		}
		if (Format.cube_size_limiter && !settings.deactivate_size_limit.value) {
			Format.cube_size_limiter.clamp(this, {}, axis, bidirectional ? null : !!negative);
		}
		this.mapAutoUV();
		if (this.box_uv) {
			Canvas.updateUV(this);
		}
		this.preview_controller.updateGeometry(this);
		TickUpdates.selection = true;
		return this;
	}
}
	Billboard.prototype.title = tl('data.billboard');
	Billboard.prototype.type = 'billboard';
	Billboard.prototype.icon = 'fa-solid fa-chess-board';
	Billboard.prototype.movable = true;
	Billboard.prototype.resizable = true;
	Billboard.prototype.rotatable = false;
	Billboard.prototype.needsUniqueName = false;
	Billboard.prototype.menu = new Menu([
		...Outliner.control_menu_group,
		'_',
		'rename',
		{name: 'menu.cube.color', icon: 'color_lens', children() {
			return markerColors.map((color, i) => {return {
				icon: 'bubble_chart',
				color: color.standard,
				name: color.name || 'cube.color.'+color.id,
				click(cube) {
					cube.forSelected(function(obj){
						obj.setColor(i)
					}, 'change color')
				}
			}});
		}},
		{name: 'menu.cube.texture', icon: 'collections', condition: () => !Project.single_texture, children: function() {
			let arr = [
				{icon: 'crop_square', name: 'menu.cube.texture.blank', click: function(cube) {
					cube.forSelected(function(obj) {
						obj.applyTexture(false, true)
					}, 'texture blank')
				}}
			]
			Texture.all.forEach(function(t) {
				arr.push({
					name: t.name,
					icon: (t.mode === 'link' ? t.img : t.source),
					click: function(cube) {
						cube.forSelected(function(obj) {
							obj.applyTexture(t, true)
						}, 'apply texture')
					}
				})
			})
			return arr;
		}},
		'toggle_visibility',
		'delete'
	]);
	Billboard.prototype.buttons = [
		Outliner.buttons.autouv,
		Outliner.buttons.mirror_uv,
		Outliner.buttons.shade,
		Outliner.buttons.export,
		Outliner.buttons.locked,
		Outliner.buttons.visibility,
	];

new Property(Billboard, 'string', 'name', {default: 'billboard'});
new Property(Billboard, 'boolean', 'locked');

OutlinerElement.registerType(Billboard, 'billboard');


new NodePreviewController(Billboard, {
	setup(element) {
		let mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), Canvas.emptyMaterials[0]);
		Project.nodes_3d[element.uuid] = mesh;
		mesh.name = element.uuid;
		mesh.type = 'billboard';
		mesh.isElement = true;
		mesh.visible = element.visibility;
		mesh.rotation.order = 'ZYX'

		mesh.geometry.setAttribute('highlight', new THREE.BufferAttribute(new Uint8Array(24).fill(0), 1));

		// Outline
		let geometry = new THREE.BufferGeometry();
		let line = new THREE.Line(geometry, Canvas.outlineMaterial);
		line.no_export = true;
		line.name = element.uuid+'_outline';
		line.visible = element.selected;
		line.renderOrder = 2;
		line.frustumCulled = false;
		mesh.outline = line;
		mesh.add(line);

		// Update
		this.updateTransform(element);
		this.updateGeometry(element);
		this.updateFaces(element);
		this.updateUV(element);

		this.dispatchEvent('setup', {element});
	},
	updateTransform(element) {
		NodePreviewController.prototype.updateTransform(element);

		let mesh = element.mesh;

		if (Format.rotate_cubes && element.rescale === true) {
			let axis = element.rotationAxis()||'y';
			let rescale = getRescalingFactor(element.rotation[getAxisNumber(axis)]);
			mesh.scale.set(rescale, rescale, rescale);
			mesh.scale[axis] = 1;
		}

		this.dispatchEvent('update_transform', {element});
	},
	updateGeometry(element) {
		if (element.resizable) {
			let mesh = element.mesh;
			let from = element.from.slice()
			from.forEach((v, i) => {
				from[i] -= element.inflate;
				from[i] -= element.origin[i];
			})
			let to = element.to.slice()
			to.forEach((v, i) => {
				to[i] += element.inflate
				to[i] -= element.origin[i];
				if (from[i] === to[i]) {
					to[i] += 0.001
				}
			})
			mesh.geometry.setShape(from, to)
			mesh.geometry.computeBoundingBox()
			mesh.geometry.computeBoundingSphere()

			// Update outline
			let vs = [0,1,2,3,4,5,6,7].map(i => {
				return mesh.geometry.attributes.position.array.slice(i*3, i*3 + 3)
			});
			let points = [
				vs[2], vs[3],
				vs[6], vs[7],
				vs[2], vs[0],
				vs[1], vs[4],
				vs[5], vs[0],
				vs[5], vs[7],
				vs[6], vs[4],
				vs[1], vs[3]
			].map(a => new THREE.Vector3().fromArray(a))
			mesh.outline.geometry.setFromPoints(points);
		}

		this.dispatchEvent('update_geometry', {element});
	},
	updateFaces(element) {
		let {mesh} = element;

		let indices = [];
		let j = 0;
		mesh.geometry.faces = [];
		mesh.geometry.clearGroups();
		let last_tex;
		Canvas.face_order.forEach((fkey, i) => {
			if (element.faces[fkey].texture !== null) {
				indices.push(0 + i*4, 2 + i*4, 1 + i*4, 2 + i*4, 3 + i*4, 1 + i*4);
				if (last_tex && element.faces[fkey].texture === last_tex) {
					mesh.geometry.groups[mesh.geometry.groups.length-1].count += 6;
				} else {
					mesh.geometry.addGroup(j*6, 6, j)
					last_tex = element.faces[fkey].texture;
				}
				mesh.geometry.faces.push(fkey)
				j++;
			}
		})
		mesh.geometry.setIndex(indices)

		if (Project.view_mode === 'solid') {
			mesh.material = Canvas.solidMaterial
		
		} else if (Project.view_mode === 'wireframe') {
			mesh.material = Canvas.wireframeMaterial
		
		} else if (Project.view_mode === 'normal') {
			mesh.material = Canvas.normalHelperMaterial
		
		} else if (Project.view_mode === 'uv') {
			mesh.material = Canvas.uvHelperMaterial

		} else if (Format.single_texture && Texture.all.length >= 2 && Texture.all.find(t => t.render_mode == 'layered')) {
			mesh.material = Canvas.getLayeredMaterial();

		} else if (Format.single_texture) {
			let tex = Texture.getDefault();
			mesh.material = tex ? tex.getMaterial() : Canvas.emptyMaterials[element.color];

		} else {
			let material;
			let tex = element.faces.front.getTexture();
			if (tex && tex.uuid) {
				mesh.material = Project.materials[tex.uuid];
			} else {
				mesh.material = Canvas.emptyMaterials[element.color];
			}
		}
		if (!mesh.material) mesh.material = Canvas.transparentMaterial;

		Billboard.preview_controller.dispatchEvent('update_faces', {element});
	},
	updateUV(element, animation = true) {
		let mesh = element.mesh
		if (mesh === undefined || !mesh.geometry) return;

		
		let stretch = 1
		let frame = 0

		stretch = 1;
		frame = 0;
		let tex = element.faces.front.getTexture();
		if (tex instanceof Texture && tex.frameCount !== 1) {
			stretch = tex.frameCount
			if (animation === true && tex.currentFrame) {
				frame = tex.currentFrame
			}
		}
		Canvas.updateUVFace(mesh.geometry.attributes.uv, fIndex, element.faces.front, frame, stretch)

		mesh.geometry.attributes.uv.needsUpdate = true;

		this.dispatchEvent('update_uv', {element});

		return mesh.geometry;
	},
	updateHighlight(element, hover_cube, force_off) {
		let mesh = element.mesh;
		let highlighted = (
			Settings.get('highlight_cubes') &&
			((hover_cube == element && !Transformer.dragging) || element.selected) &&
			Modes.edit &&
			!force_off
		) ? 1 : 0;

		if (mesh.geometry.attributes.highlight.array[0] != highlighted) {
			mesh.geometry.attributes.highlight.array.set(Array(mesh.geometry.attributes.highlight.count).fill(highlighted));
			mesh.geometry.attributes.highlight.needsUpdate = true;
		}

		this.dispatchEvent('update_highlight', {element});
	},
	updatePaintingGrid(cube) {
		let mesh = cube.mesh;
		if (mesh === undefined) return;
		mesh.remove(mesh.grid_box);
		if (cube.visibility == false) return;

		if (!Modes.paint || !settings.painting_grid.value) return;

		let from = cube.from.slice();
		let to = cube.to.slice();
		if (cube.inflate) {
			from[0] -= cube.inflate; from[1] -= cube.inflate; from[2] -= cube.inflate;
			  to[0] += cube.inflate;   to[1] += cube.inflate;   to[2] += cube.inflate;
		}

		let vertices = [];
		let epsilon = 0.0001
		function getVector2(arr, axis) {
			switch (axis) {
				case 0: return [arr[1], arr[2]]; break;
				case 1: return [arr[0], arr[2]]; break;
				case 2: return [arr[0], arr[1]]; break;
			}
		}
		function addVector(u, v, axis, w) {
			switch (axis) {
				case 0: vertices.push(w, u, v); break;
				case 1: vertices.push(u, w, v); break;
				case 2: vertices.push(u, v, w); break;
			}
		}

		let start = getVector2(from, axis)
		let end = getVector2(to, axis)
		let face = cube.faces.front;
		let texture = face.getTexture();
		if (texture === null) return;

		let px_x = texture ? Project.texture_width / texture.width : 1;
		let px_y = texture ? Project.texture_height / texture.height : 1;
		let uv_size = [
			Math.abs(face.uv_size[0]),
			Math.abs(face.uv_size[1])
		]
		uv_offset = [
			uv_offset[0] == true
				? (face.uv_size[0] > 0 ? (px_x-face.uv[2]) : (	   face.uv[2]))
				: (face.uv_size[0] > 0 ? (     face.uv[0]) : (px_x-face.uv[0])),
			uv_offset[1] == true
				? (face.uv_size[1] > 0 ? (px_y-face.uv[3]) : (	   face.uv[3]))
				: (face.uv_size[1] > 0 ? (     face.uv[1]) : (px_y-face.uv[1]))
		]
		uv_offset[0] = uv_offset[0] % px_x;
		uv_offset[1] = uv_offset[1] % px_y;
		
		if ((face.rotation % 180 == 90) != (axis == 0)) {
			uv_size.reverse();
			uv_offset.reverse();
		};

		let w = side == 0 ? from[axis] : to[axis]

		//Columns
		let width = end[0]-start[0];
		let step = Math.abs( width / uv_size[0] );
		if (texture) step *= Project.texture_width / texture.width;
		if (step < epsilon) step = epsilon;

		for (var col = start[0] - uv_offset[0]; col <= end[0]; col += step) {
			if (col >= start[0]) {
				addVector(col, start[1], axis, w);
				addVector(col, end[1], axis, w);
			}
		}

		//lines
		let height = end[1]-start[1];
		step = Math.abs( height / uv_size[1] );
		if (texture) {
			let tex_height = texture.frameCount ? (texture.height / texture.frameCount) : texture.height;
			step *= Project.texture_height / tex_height;
		}
		if (step < epsilon) step = epsilon;

		for (var line = start[1] - uv_offset[1]; line <= end[1]; line += step) {
			if (line >= start[1]) {
				addVector(start[0], line, axis, w);
				addVector(end[0], line, axis, w);
			}
		}


		let geometry = new THREE.BufferGeometry();
		geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );

		let box = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({color: gizmo_colors.grid}));
		box.geometry.translate(-cube.origin[0], -cube.origin[1], -cube.origin[2]);
		box.no_export = true;

		box.name = cube.uuid+'_grid_box';
		box.renderOrder = 2;
		box.frustumCulled = false;
		mesh.grid_box = box;
		mesh.add(box);

		this.dispatchEvent('update_painting_grid', {element: cube});
	}
})

BARS.defineActions(function() {
	new Action({
		id: 'add_billboard',
		icon: 'new_window',
		category: 'edit',
		condition: () => Modes.edit,
		click: function () {
			
			Undo.initEdit({outliner: true, elements: [], selection: true});
			let new_billboard = new Billboard().init()
			if (!new_billboard.box_uv) new_billboard.mapAutoUV()
			let group = getCurrentGroup();
			if (group) {
				new_billboard.addTo(group)
				new_billboard.color = group.color;
			}

			new_billboard.faces.front.texture = Texture.getDefault().uuid;
			UVEditor.loadData();

			if (Format.bone_rig) {
				let pos1 = group ? group.origin.slice() : [0, 0, 0];
				let size = Settings.get('default_cube_size');
				if (size % 2 == 0) {
					new_billboard.extend({
						from:[ pos1[0] - size/2, pos1[1] - 0,    pos1[2] - size/2 ],
						to:[   pos1[0] + size/2, pos1[1] + size, pos1[2] + size/2 ],
						origin: pos1.slice()
					})
				} else {
					new_billboard.extend({
						from:[ pos1[0], pos1[1], pos1[2] ],
						to:[   pos1[0]+size, pos1[1]+size, pos1[2]+size ],
						origin: pos1.slice()
					})
				}
			}

			if (Group.selected) Group.selected.unselect()
			new_billboard.select()
			Canvas.updateView({elements: [new_billboard], element_aspects: {transform: true, geometry: true}})
			Undo.finishEdit('Add billboard', {outliner: true, elements: selected, selection: true});
			Blockbench.dispatchEvent( 'add_billboard', {object: new_billboard} )

			Vue.nextTick(function() {
				if (settings.create_rename.value) {
					new_billboard.rename()
				}
			})
			return new_billboard
		}
	})
})