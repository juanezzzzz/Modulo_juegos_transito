from django.shortcuts import render

def inicio(request):
    return render(request, 'inicio.html')

def sala1(request):
    return render(request, 'sala1.html')

def sala2(request):
    return render(request, 'sala2.html')

def sala3(request):
    return render(request, 'sala3.html')

def sala4(request):
    return render(request, 'sala4.html')