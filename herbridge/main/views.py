import json
import logging
import requests

from django.conf import settings
from django.core.exceptions import ValidationError
from django.http import JsonResponse, Http404
from django.shortcuts import render, get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.contrib.gis.db.models.functions import Distance
from django.contrib.gis.geos import GEOSGeometry
from main.models import get_model
from main.api import ArchesAPI
from rest_framework import generics
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.parsers import MultiPartParser, JSONParser
from rest_framework.response import Response

arches_api = ArchesAPI()

def home(request):
    return render(request, 'index.html')


def api_ref(request):
    model_list = [
        'assessors',
        'events',
        'images',
        'reports',
        'resources',
    ]

    ref_links = []
    for name in model_list:
        model = get_model(name)
        ref_links.append((f"/api/{name}/", "list all"))
        ob = model.objects.all()[0]
        ref_links.append((f"/api/{name}/{ob.pk}/", "get by id"))

    return render(request, 'api_ref.html', {'ref_links': ref_links})


class ListView(generics.ListCreateAPIView):
    """
    Returns a list of all instances as specified by the model name in the url.
    """
    parser_classes = (MultiPartParser, JSONParser)

    @csrf_exempt
    def dispatch(self, request, *args, **kwargs):
        return super(ListView, self).dispatch(request, *args, **kwargs)

    def get_queryset(self):
        model = get_model(self.kwargs.get('model'))
        return model.objects.all()

    def get_serializer_class(self):
        model = get_model(self.kwargs.get('model'))
        return model.serializer


class InstanceView(generics.RetrieveAPIView):
    """
    Returns a single instance as specified by the model name and pk in the url.
    """

    def get_queryset(self):
        model = get_model(self.kwargs.get('model'))
        return model.objects.filter(pk=self.kwargs.get('pk'))

    def get_serializer_class(self):
        model = get_model(self.kwargs.get('model'))
        return model.serializer


class LoginAuthToken(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        body_unicode = request.body
        if not body_unicode:
            return Response({
                'detail': 'No password specified'
            }, status=422)

        # Extract out the password
        body = json.loads(request.body)
        if 'password' not in body:
            return Response({
                'detail': 'No password specified'
            }, status=422)

        # Check the password matches
        if body['password'] == settings.FRONTEND_AUTH_PASSWORD:
            return Response({
                'token': settings.FRONTEND_AUTH_TOKEN
            })
        else:
            return Response({
                'detail': 'Password is incorrect'
            }, status=401)


def get_eamena_resource_for_polygon(request):
    try:
        if request.method != "POST":
            raise Http404()
        elif request.body:
            arches_api.initialise_tokens()
            # Execute the search resource query
            response = arches_api.search_resources(request)

            if response["status_code"] == 200:
                return JsonResponse(response["hits"], safe=False)
            else:
                return JsonResponse(status=400, data={"message": "Eamena failed to provide resources, check polygon"})
        else:
            return JsonResponse(status=400, data={"message": "Missing request body"})
    except Exception as e:
        # Log and raise any exception
        logging.error(e)
        raise e



def get_images_for_polygon(request):
    if request.method != "POST":
        raise Http404()
    elif request.body:
        try:
            polygon = GEOSGeometry(request.body)
            qs = Image.objects.filter(geom__intersects=polygon)[:500]
            return JsonResponse(status=200, data=HBSerializer().serialize(qs), safe=False)
        except Exception as e:
            return JsonResponse(status=400, data={"message": "Invalid geopolygon"})
    else:
        return JsonResponse(status=400, data={"message": "Missing request body"})


def submit_image_for_resource(request):
    if request.method != "POST":
        raise Http404()
    elif request.body:
        arches_api.initialise_tokens()
        response = arches_api.submit_image_report(json.loads(request.body))

        if response["status_code"] == 201:
            return JsonResponse(response.json(), safe=False)
        else:
            response["status_code"] = 200
            return response
    else:
        return JsonResponse(status=400, data={"message": "Missing request body"})

# DEPRECATED JULY 17 - WAS PART OF EARLY API
from main.utils.serializers import HBSerializer
from main.models import Assessor, Event, Image, Report, Resource

def api_dispatch(request, model_name=None, id=None):
    lookup = {
        'assessors': Assessor,
        'events': Event,
        'images': Image,
        'reports': Report,
        'resources': Resource,
    }

    if not model_name or not model_name in lookup:
        raise Http404()

    model = lookup[model_name]
    if id:
        try:
            i = get_object_or_404(model, pk=id)
        except ValidationError:
            raise Http404()
        data = i.as_json()
    else:
        i = model.objects.all()
        data = HBSerializer().serialize(i)

    return JsonResponse(data, safe=False)
