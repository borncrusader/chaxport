.PHONY: icongen
icongen: public/icons/icon-16.png public/icons/icon-32.png public/icons/icon-48.png public/icons/icon-128.png

public/icons/icon-16.png: public/icons/favicon.svg
	magick -background none public/icons/favicon.svg -resize 16x16 public/icons/icon-16.png

public/icons/icon-32.png: public/icons/favicon.svg
	magick -background none public/icons/favicon.svg -resize 32x32 public/icons/icon-32.png

public/icons/icon-48.png: public/icons/favicon.svg
	magick -background none public/icons/favicon.svg -resize 48x48 public/icons/icon-48.png

public/icons/icon-128.png: public/icons/favicon.svg
	magick -background none public/icons/favicon.svg -resize 128x128 public/icons/icon-128.png

