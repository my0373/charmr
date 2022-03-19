from django.http import HttpResponse
from django.template import loader



def index(request):
    template = loader.get_template('news/index.html')
    context = {
        'Headline': "The headlines",
    }
    return HttpResponse(template.render(context, request))