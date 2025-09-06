.PHONY: icongen
icongen: icon-16.png icon-32.png icon-48.png icon-128.png

icon-16.png: favicon.svg
	magick -background none favicon.svg -resize 16x16 icon-16.png

icon-32.png: favicon.svg
	magick -background none favicon.svg -resize 32x32 icon-32.png

icon-48.png: favicon.svg
	magick -background none favicon.svg -resize 48x48 icon-48.png

icon-128.png: favicon.svg
	magick -background none favicon.svg -resize 128x128 icon-128.png

