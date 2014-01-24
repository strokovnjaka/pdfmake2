(function() {
	function printer(layout, pdfkit) {

		function PdfPrinter(fontDescriptors) {
			this.pdfKitDoc = new pdfkit();
			this.fontProvider = new FontProvider(fontDescriptors, this.pdfKitDoc);
		}

		PdfPrinter.prototype.createPdfKitDocument = function(docDefinition) {
			var builder = new layout.LayoutBuilder(
				this.fontProvider, 
				docDefinition.pageSize || { width: 595.28, height: 741.89 },
				docDefinition.pageMargins || { left: 40, top: 40, bottom: 40, right: 40 });

			var pages = builder.layoutDocument(docDefinition.content, docDefinition.styles || {}, docDefinition.defaultStyle || { fontSize: 12, font: 'Roboto' });

			renderPages(pages, this.fontProvider, this.pdfKitDoc);
			return this.pdfKitDoc;
		};

		function renderPages(pages, fontProvider, pdfKitDoc) {
			for(var i = 0, l = pages.length; i < l; i++) {
				if (i > 0) {
					pdfKitDoc.addPage();
				}

				setFontRefs(fontProvider, pdfKitDoc);

				var page = pages[i];
				for(var bi = 0, bl = page.blocks.length; bi < bl; bi++) {
					var block = page.blocks[bi];
					renderBlock(block, pdfKitDoc);
				}
			}
		}

		function setFontRefs(fontProvider, pdfKitDoc) {
			for(var fontName in fontProvider.cache) {
				var desc = fontProvider.cache[fontName];

				for (var fontType in desc) {
					var font = desc[fontType];

					if ((_ref = (_base = pdfKitDoc.page.fonts)[_name = font.id]) == null) {
						_base[_name] = font.ref;
					}
				}
			}
		}

		function renderBlock(block, pdfKitDoc) {
			var x = block.x || 0,
				y = block.y || 0,
				yOffset = 0;

			for(var i = 0, l = block.lines.length; i < l; i++) {
				var line = block.lines[i];
				renderLine(line, x + line.x, y + yOffset, pdfKitDoc);
				yOffset += line.getHeight();
			}
		}

		function renderLine(line, x, y, pdfKitDoc) {
			var x = x || 0,
				y = y || 0;

			//TODO: line.optimizeInlines();

			for(var i = 0, l = line.inlines.length; i < l; i++) {
				var inline = line.inlines[i];

				pdfKitDoc.save();
				pdfKitDoc.transform(1, 0, 0, -1, 0, pdfKitDoc.page.height);

				pdfKitDoc.addContent('BT');
				pdfKitDoc.addContent("" + (x + inline.x) + " " + (pdfKitDoc.page.height - y - line.getHeight()) + " Td");
				pdfKitDoc.addContent("/" + inline.font.id + " " + inline.fontSize + " Tf");

				pdfKitDoc.addContent("<" + encode(inline.font, inline.text) + "> Tj");

				pdfKitDoc.addContent('ET');
				pdfKitDoc.restore();
			}
		}

		function encode(font, text) {
			font.use(text);

			text = font.encode(text);
			text = ((function() {
				var _ref2, _results;
				_results = [];
				for (var i = 0, _ref2 = text.length; 0 <= _ref2 ? i < _ref2 : i > _ref2; 0 <= _ref2 ? i++ : i--) {
				  _results.push(text.charCodeAt(i).toString(16));
				}
				return _results;
			})()).join('');
			
			return text;
		}



		function FontProvider(fontDescriptors, pdfDoc) {
			this.fonts = {};
			this.pdfDoc = pdfDoc;
			this.cache = {};

			for(var font in fontDescriptors) {
				if (fontDescriptors.hasOwnProperty(font)) {
					var fontDef = fontDescriptors[font];

					this.fonts[font] = {
						normal: fontDef.normal,
						bold: fontDef.bold,
						italics: fontDef.italics,
						bolditalics: fontDef.bolditalics
					}
				}
			}
		}

		FontProvider.prototype.provideFont = function(familyName, bold, italics) {
			if (!this.fonts[familyName]) return this.pdfDoc._font;

			var type = 'normal';

			if (bold && italics) type = 'bolditalics';
			else if (bold) type = 'bold';
			else if (italics) type = 'italics';

			if (!this.cache[familyName]) this.cache[familyName] = {};

			var cached = this.cache[familyName] && this.cache[familyName][type];

			if (cached) return cached;

			var fontCache = (this.cache[familyName] = this.cache[familyName] || {});
			fontCache[type] = this.pdfDoc.font(this.fonts[familyName][type])._font;
			return fontCache[type]
		};

		return PdfPrinter;
	};

	if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
		module.exports = printer(require('./layout'), require('pdfkit'));
	}
	else {
		if (typeof define === 'function' && define.amd) {
			define(['layout', 'pdfkit'], function(layout, pdfkit) {
				return printer(layout, pdfkit);
			});
		} else {
			if(!window.PDFMake.layout) {
				throw 'PDFMake.layout not found';
			}
			if(!window.PDFMake.pdfkit) {
				throw 'PDFMake.pdfkit not found';
			}

			window.PDFMake.Printer = printer(window.PDFMake.layout, window.PDFMake.pdfkit);
		}
	}
})();