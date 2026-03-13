%% -------- READ CSV FILE --------
T = readtable("Test1.csv");

t_ms = T{:,1};
I_A  = T{:,2};

t_s = (t_ms - t_ms(1))/1000;   % Time in seconds (start at 0)

%% -------- SAMPLING INFO --------
dt_ms = mean(diff(t_ms));
fs = 1000/dt_ms;

%% -------- BUTTERWORTH FILTER --------
fc = 5;
order = 2;

[b,a] = butter(order, fc/(fs/2));
I_filt = filtfilt(b,a,I_A);

%% -------- COMMAND (what you typed in Serial) --------
I0_cmd = 0.50;
A_cmd  = 0.20;
f_cmd  = 0.25;

w = 2*pi*f_cmd;

%% -------- OPTIONAL: IGNORE INITIAL TRANSIENT --------
cycles_to_drop = 1;
t_drop = cycles_to_drop*(1/f_cmd);

idx = t_s >= t_drop;
t_fit = t_s(idx);
y_fitdata = I_filt(idx);

%% -------- SINE FIT (gain/phase/offset only) --------
X = [ones(size(t_fit)), sin(w*t_fit), cos(w*t_fit)];
theta = X \ y_fitdata;

c = theta(1);
a_sin = theta(2);
b_cos = theta(3);

A_meas = hypot(a_sin, b_cos);
phi_meas = atan2(b_cos, a_sin);

gain = A_meas / A_cmd;
phase_deg = wrapToPi(phi_meas) * 180/pi;

%% -------- BASIC OSCILLATION METRICS --------
I_mean = mean(I_filt);
I_pkpk = max(I_filt) - min(I_filt);
A_pkpk = I_pkpk/2;

[~,locs] = findpeaks(y_fitdata, t_fit, "MinPeakProminence", 0.05);
f_est = NaN;
if numel(locs) >= 2
    T_est = mean(diff(locs));
    f_est = 1/T_est;
end

%% -------- PLOT --------
figure('Color','w');

plot(t_s, I_A, 'LineWidth',1.0);
hold on;
plot(t_s, I_filt, 'LineWidth',2);

grid on;
box on;

ax = gca;
ax.FontSize = 20;   % axis numbers

xlabel("Time (s)", 'FontSize',20);
ylabel("Measured Current (A)", 'FontSize',20);

ttl = title("MPB Response to Sinusoidal Current Input Centre 0.5A, Amplitude 0.2A, 0.25Hz");
ttl.FontSize = 14;

xlim([min(t_s) max(t_s)]);

lgd = legend("Raw", ...
             "Filtered (Butterworth 5 Hz)", ...
             "Location","best");
lgd.FontSize = 20;

%% -------- PRINT RESULTS --------
fprintf("Sampling frequency: %.1f Hz\n", fs);
fprintf("Command: I0 = %.3f A, A = %.3f A, f = %.3f Hz\n", I0_cmd, A_cmd, f_cmd);
fprintf("Measured mean current: %.3f A\n", I_mean);
fprintf("Measured peak-to-peak: %.3f A  (amplitude %.3f A)\n", I_pkpk, A_pkpk);
fprintf("Sine-fit offset: %.3f A\n", c);
fprintf("Sine-fit amplitude: %.3f A\n", A_meas);
fprintf("Gain (A_meas/A_cmd): %.3f\n", gain);
fprintf("Phase lag: %.1f deg\n", phase_deg);
if ~isnan(f_est)
    fprintf("Estimated frequency from peaks: %.3f Hz\n", f_est);
end