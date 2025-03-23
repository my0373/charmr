
from django.shortcuts import render

def image_gallery(request):
    return render(request, 'gallery/gallery.html')
