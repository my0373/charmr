from django.urls import path
from .views import image_gallery

urlpatterns = [
    path('images/', image_gallery, name='image_gallery'),
]
