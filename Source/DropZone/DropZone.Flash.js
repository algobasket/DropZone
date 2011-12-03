/*
---

name: DropZone.Flash

description: A DropZone module. Handles uploading using the Flash method

license: MIT-style license

authors:
  - Mateusz Cyrankiewicz
  - Juan Lago

requires: [DropZone]

provides: [DropZone.Flash]

...
*/

DropZone.Flash = new Class({

	Extends: DropZone,

	initialize: function (options) {
		
		this.setOptions(options);
		
		this.method = 'Flash'
		
		this.activate();
		
	},
	
	activate: function () {
		
		this.parent();
				
		// Translate file type filter
		var filters = this._flashFilter(this.options.accept);

		var btn = this.uiButton;
		var btnposition = btn.getPosition(btn.getOffsetParent());
		var btnsize = btn.getSize();
		
		// Create container for flash
		var flashcontainer = new Element('div', {
			id: 'dropzone_flash_wrap',
			styles: {
				position: 'absolute',
				top: btnposition.y,
				left: btnposition.x
			}
		}).inject(this.hiddenContainer);

		// Prevent IE cache bug
		if (Browser.ie) this.options.flash.movie += (this.options.flash.movie.contains('?') ? '&' : '?') + 'dropzone_movie=' + Date.now();

		// Deploy flash movie
		this.flashObj = new Swiff(this.options.flash.movie, {
			container: flashcontainer.get('id'),
			width: btnsize.x,
			height: btnsize.y,
			params: {
				wMode: 'transparent',
				bgcolor: '#000000'
			},
			callBacks: {

				load: function () {
					
					Swiff.remote(this.flashObj.toElement(), 'xInitialize', {
						multiple: this.options.multiple,
						url: this.url,
						method: 'post',
						queued: this.options.max_queue,
						fileSizeMin: this.options.min_file_size,
						fileSizeMax: this.options.max_file_size,
						typeFilter: filters,
						mergeData: true,
						data: this._cookieData(),
						verbose: true
					});

					this.isFlashLoaded = true;

				}.bind(this),

				select: function (files) {
					
					this.addFiles(files[0]);
					
					this.nCurrentUploads = files[0].length;
					
				}.bind(this),

				complete: function (resume) {
					
					this.isUploading = false;
					
				}.bind(this),

				fileOpen: function (file) {
					
					//
					
				}.bind(this),

				fileProgress: function (r) {
					
					var file = r[0];
					
					// flash returns vals starting with 1
					file.id--;
					
					var item,
						perc = file.progress.percentLoaded;
					if (this.uiList) item = this.uiList.getElement('#dropzone_item_' + file.id);
					this.fileList[file.id].progress = perc;
					
					this.fireEvent('itemProgress', [item, perc]);
					
					this._updateQueueProgress();
					
				}.bind(this),

				fileComplete: function (r) {
					
					var file = r[0];
					
					// flash returns vals starting with 1
					file.id--;
					
					this.fileList[file.id].uploaded = true;
					
					var item;
					if (this.uiList) item = this.uiList.getElement('#dropzone_item_' + file.id);
					
					// get response right
					
					var response = JSON.decode(file.response.text);
					
					if (this._checkResponse(response)) {
						
						this._itemComplete(item, file, response);
						
					} else {
						
						this._itemError(item, file, response);
												
					}
					
				}.bind(this)

			}
		});

		// toElement() method doesn't work in IE
		/*
		var flashElement = this.flashObj.toElement();
		
		// Check flash load
		if (!flashElement.getParent() || flashElement.getStyle('display') == 'none')
		{
		  subcontainer.set('html', this.options.texts.noflash);
		  return false;
		}
		*/

	},

	upload: function () {
		
		this.parent();
		
		if (!this.isUploading) {

			this.isUploading = true;

			for (var i = 0, f; f = this.fileList[i]; i++) {
				if (!f.uploading) {
					Swiff.remote(this.flashObj.toElement(), 'xFileStart', i + 1);
					this.fileList[i].uploading = true;
				}
			}

		}

	},

	_flashFilter: function (filters) {
		var filtertypes = {},
			assocfilters = {},
			extensions = {
			'image': '*.jpg; *.jpeg; *.gif; *.png; *.bmp;',
			'video': '*.avi; *.mpg; *.mpeg; *.flv; *.ogv; *.webm; *.mov; *.wm;',
			'text': '*.txt; *.rtf; *.doc; *.docx; *.odt; *.sxw;',
			'*': '*.*;'
		}

		filters.split(',').each(function (val) {
			val = val.split('/').invoke('trim');
			filtertypes[val[0]] = (filtertypes[val[0]] ? filtertypes[val[0]] + ' ' : '') + '*.' + val[1] + ';';
		});

		Object.each(filtertypes, function (val, key) {
			var newindex = key == '*' ? 'All Files' : key.capitalize();
			if (val == '*.*;') val = extensions[key];
			assocfilters[newindex + ' (' + val + ')'] = val;
		});

		return assocfilters;
	},

	// appendCookieData based in Swiff.Uploader.js
	_cookieData: function () {

		var hash = {};

		document.cookie.split(/;\s*/).each(function (cookie) {

			cookie = cookie.split('=');

			if (cookie.length == 2) {
				hash[decodeURIComponent(cookie[0])] = decodeURIComponent(cookie[1]);
			}
		});

		return hash;
	},

	cancel: function (id) {
		
		this.parent();
		
		this.fileList[id].checked = false;
		Swiff.remote(this.flashObj.toElement(), 'xFileRemove', id + 1);
		
	}

});