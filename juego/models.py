from django.db import models

class Sala(models.Model):
    nombre = models.CharField(max_length=100)
    pregunta = models.TextField()
    respuesta_correcta = models.CharField(max_length=100)

    def __str__(self):
        return self.nombre