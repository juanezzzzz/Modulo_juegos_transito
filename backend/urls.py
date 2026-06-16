from django.contrib import admin
from django.urls import path
from juego import views

urlpatterns = [
    path('admin/', admin.site.urls),

    path('', views.inicio, name='inicio'),
    path('sala1/', views.sala1, name='sala1'),
    path('sala2/', views.sala2, name='sala2'),
    path('sala3/', views.sala3, name='sala3'),
    path('sala4/', views.sala4, name='sala4'),
]