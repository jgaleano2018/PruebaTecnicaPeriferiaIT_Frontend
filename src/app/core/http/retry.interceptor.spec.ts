import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TEST_CONFIG } from '../../../testing/test-config';
import { provideAppConfig } from '../config/app-config';
import { retryInterceptor } from './retry.interceptor';

describe('retryInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        provideAppConfig({ ...TEST_CONFIG, httpRetryCount: 2, httpRetryDelayMs: 10 }),
        provideHttpClient(withInterceptors([retryInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    backend.verify();
    vi.useRealTimers();
  });

  it('retries idempotent GET requests on 503 and succeeds', async () => {
    const next = vi.fn();
    http.get('http://api.test/api/v1/feed').subscribe(next);

    backend.expectOne('http://api.test/api/v1/feed').flush(null, { status: 503, statusText: 'Unavailable' });
    await vi.advanceTimersByTimeAsync(10);
    backend.expectOne('http://api.test/api/v1/feed').flush({ ok: true });

    expect(next).toHaveBeenCalledWith({ ok: true });
  });

  it('does not retry client errors', () => {
    const error = vi.fn();
    http.get('http://api.test/api/v1/feed').subscribe({ error });

    backend.expectOne('http://api.test/api/v1/feed').flush(null, { status: 400, statusText: 'Bad Request' });

    expect(error).toHaveBeenCalledTimes(1);
  });

  it('never retries POST requests', () => {
    const error = vi.fn();
    http.post('http://api.test/api/v1/posts', {}).subscribe({ error });

    backend.expectOne('http://api.test/api/v1/posts').flush(null, { status: 503, statusText: 'Unavailable' });

    expect(error).toHaveBeenCalledTimes(1);
  });
});
